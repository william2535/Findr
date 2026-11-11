package com.findr.app;
import android.app.Activity;
import android.os.Bundle;
import android.content.Intent;
import android.net.Uri;
import android.graphics.Color;
import android.webkit.*;
import android.view.View;
import java.io.*;
import java.net.*;
import java.util.*;
import org.json.JSONObject;
import android.util.Base64;
import android.widget.Toast;
import java.util.concurrent.ConcurrentHashMap;

public class MainActivity extends Activity {
  private WebView web;
  private JSONObject downloads;
  private ValueCallback<Uri[]> chooser;
  private static final String HOST="appassets.androidplatform.net";
  private static final String RELAY="https://findr-fault-finder.floodyyy21.chatgpt.site/api/assistant/online";
  private volatile boolean trustedPage=false;
  private final Map<String,HttpURLConnection> onlineConnections=new ConcurrentHashMap<>();
  private final Set<String> onlineRequests=Collections.newSetFromMap(new ConcurrentHashMap<String,Boolean>());
  private File exportFile;
  private OutputStream exportOutput;
  private String exportId,exportName,exportMime;
  private long exportExpected,exportWritten;
  private final Object exportLock=new Object();
  @Override public void onCreate(Bundle saved) {
    super.onCreate(saved);
    getWindow().setStatusBarColor(Color.rgb(17,17,17)); getWindow().setNavigationBarColor(Color.rgb(17,17,17));
    try {downloads=new JSONObject(readAll(getAssets().open("www/data/download-map.json")));} catch(Exception e){downloads=new JSONObject();}
    web=new WebView(this);web.setBackgroundColor(Color.rgb(17,17,17));
    WebSettings settings=web.getSettings();settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);settings.setAllowFileAccess(false);settings.setAllowContentAccess(true);settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);settings.setMediaPlaybackRequiresUserGesture(true);settings.setUserAgentString(settings.getUserAgentString()+" FINDRAndroid/0.1");
    web.setOnApplyWindowInsetsListener((v,insets)->{v.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());return insets;});
    web.addJavascriptInterface(new NativeBridge(),"FindrNative");
    web.setWebViewClient(new WebViewClient(){
      @Override public void onPageStarted(WebView v,String url,android.graphics.Bitmap icon){trustedPage=trustedDocument(Uri.parse(url));}
      @Override public WebResourceResponse shouldInterceptRequest(WebView v,WebResourceRequest r){
        Uri uri=r.getUrl();if(!HOST.equals(uri.getHost())||!"https".equals(uri.getScheme()))return null;
        String path=uri.getPath();
        try {
          if(path.startsWith("/api/manual/"))return manual(path.substring(12));
          if(!path.startsWith("/app/")||path.contains(".."))return error(404,"Not found");
          String file=path.substring(5);if(file.isEmpty())file="index.html";
          if(!"GET".equals(r.getMethod())&&!"HEAD".equals(r.getMethod()))return error(405,"Method not supported");
          Map<String,String> headers=new HashMap<>();headers.put("Cache-Control","no-cache");
          // JavascriptInterface does not expose a caller's frame origin. Keep
          // the bridge only in the bundled main document: no frames, plugins
          // or remote scripts may enter this WebView. Workers remain local.
          if(file.endsWith(".html"))headers.put("Content-Security-Policy","script-src 'self' blob: 'unsafe-eval' 'wasm-unsafe-eval'; worker-src 'self' blob:; frame-src 'none'; object-src 'none'; base-uri 'none'");
          return new WebResourceResponse(mime(file),null,200,"OK",headers,getAssets().open("www/"+file));
        }catch(Exception e){return error(404,"App file unavailable");}
      }
      @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){Uri u=r.getUrl();if(trustedDocument(u))return false;if(r.isForMainFrame()&&("https".equals(u.getScheme())||"http".equals(u.getScheme())||"tel".equals(u.getScheme()))){try{startActivity(new Intent(Intent.ACTION_VIEW,u));}catch(Exception ignored){}}return true;}
    });
    web.setWebChromeClient(new WebChromeClient(){@Override public boolean onShowFileChooser(WebView v,ValueCallback<Uri[]> callback,FileChooserParams params){if(chooser!=null)chooser.onReceiveValue(null);chooser=callback;Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT);i.addCategory(Intent.CATEGORY_OPENABLE);String[] types=acceptedTypes(params.getAcceptTypes());i.setType(types.length==1?types[0]:"*/*");if(types.length>1)i.putExtra(Intent.EXTRA_MIME_TYPES,types);i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE,params.getMode()==FileChooserParams.MODE_OPEN_MULTIPLE);try{startActivityForResult(i,7);return true;}catch(Exception e){chooser.onReceiveValue(null);chooser=null;return true;}}});
    setContentView(web);
    web.loadUrl("https://"+HOST+"/app/index.html");
  }
  private WebResourceResponse manual(String id){
    if(!downloads.has(id))return error(404,"Manual is not in this catalogue snapshot");
    try{
      URL url=new URL(downloads.getString(id));
      for(int n=0;n<6;n++){
        String h=url.getHost().toLowerCase(Locale.ROOT);
        if(!url.getProtocol().equals("https")||h.indexOf('.')<0||h.contains(":")||h.endsWith(".local")||h.endsWith(".localhost")||h.matches("[0-9.]+")||url.getUserInfo()!=null)return error(400,"Open this publisher link in your browser and import its PDF");
        HttpURLConnection connection=(HttpURLConnection)url.openConnection();connection.setConnectTimeout(20000);connection.setReadTimeout(60000);connection.setInstanceFollowRedirects(false);connection.setRequestProperty("Accept","application/pdf");connection.setRequestProperty("User-Agent","FINDR/0.1 (user requested manual download)");int status=connection.getResponseCode();
        if(status==301||status==302||status==303||status==307||status==308){String next=connection.getHeaderField("Location");connection.disconnect();if(next==null)break;url=new URL(url,next);continue;}
        if(status!=200){connection.disconnect();return error(502,"Publisher returned "+status+". Retry or import the PDF from its source.");}
        long size=connection.getContentLengthLong();if(size>125829120){connection.disconnect();return error(413,"File is over 120 MB");}
        Map<String,String> headers=new HashMap<>();headers.put("Cache-Control","no-store");if(size>0)headers.put("Content-Length",Long.toString(size));
        InputStream input=new FilterInputStream(connection.getInputStream()){@Override public void close()throws IOException{super.close();connection.disconnect();}};
        return new WebResourceResponse("application/pdf",null,200,"OK",headers,input);
      }
    }catch(Exception e){return error(502,"Publisher unavailable. Check your connection or import the PDF from its source.");}
    return error(502,"Too many publisher redirects");
  }
  private static String readAll(InputStream input)throws IOException{ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] b=new byte[8192];int n;while((n=input.read(b))!=-1)out.write(b,0,n);input.close();return out.toString("UTF-8");}
  private static WebResourceResponse error(int status,String text){return new WebResourceResponse("text/plain","UTF-8",status,"Error",Collections.singletonMap("Cache-Control","no-store"),new ByteArrayInputStream(text.getBytes(java.nio.charset.StandardCharsets.UTF_8)));}
  private static String mime(String path){if(path.endsWith(".html"))return "text/html";if(path.endsWith(".mjs")||path.endsWith(".js"))return "text/javascript";if(path.endsWith(".json")||path.endsWith(".webmanifest"))return "application/json";if(path.endsWith(".css"))return "text/css";if(path.endsWith(".svg"))return "image/svg+xml";if(path.endsWith(".png"))return "image/png";if(path.endsWith(".jpg")||path.endsWith(".jpeg"))return "image/jpeg";if(path.endsWith(".webp"))return "image/webp";if(path.endsWith(".woff2"))return "font/woff2";if(path.endsWith(".woff"))return "font/woff";if(path.endsWith(".pdf"))return "application/pdf";if(path.endsWith(".wasm"))return "application/wasm";return "application/octet-stream";}
  private static boolean trustedDocument(Uri uri){return "https".equals(uri.getScheme())&&HOST.equals(uri.getHost())&&(uri.getPort()==-1||uri.getPort()==443)&&uri.getUserInfo()==null&&("/app/".equals(uri.getPath())||"/app/index.html".equals(uri.getPath()));}
  private static String[] acceptedTypes(String[] accepts){Set<String> types=new LinkedHashSet<>();if(accepts!=null)for(String group:accepts)for(String raw:group.split(",")){String type=raw.trim().toLowerCase(Locale.ROOT);if(type.equals(".pdf"))type="application/pdf";else if(type.equals(".json"))type="application/json";else if(type.equals(".csv"))type="text/csv";else if(type.equals(".tsv"))type="text/tab-separated-values";else if(type.equals(".txt"))type="text/plain";if(type.matches("[a-z0-9.+-]+/[a-z0-9.*+-]+"))types.add(type);}if(types.isEmpty())types.add("*/*");return types.toArray(new String[0]);}
  @Override protected void onActivityResult(int request,int result,Intent data){super.onActivityResult(request,result,data);if(request==7&&chooser!=null){chooser.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result,data));chooser=null;}if(request==8){if(result==RESULT_OK&&data!=null&&data.getData()!=null)saveExport(data.getData());else clearExport();}}
  private void notice(String text){runOnUiThread(()->Toast.makeText(this,text,Toast.LENGTH_LONG).show());}
  private void deliverOnline(String id,int status,String contentType,byte[] body){if(!onlineRequests.remove(id))return;onlineConnections.remove(id);try{JSONObject reply=new JSONObject();reply.put("id",id);reply.put("status",status);reply.put("contentType",contentType);reply.put("body",Base64.encodeToString(body,Base64.NO_WRAP));String payload=JSONObject.quote(reply.toString());runOnUiThread(()->{if(web!=null&&trustedPage)web.evaluateJavascript("window.dispatchEvent(new CustomEvent('findr-native-online',{detail:"+payload+"}));",null);});}catch(Exception ignored){}}
  private byte[] limited(InputStream input,int max)throws IOException{try(InputStream source=input;ByteArrayOutputStream out=new ByteArrayOutputStream()){byte[] buffer=new byte[8192];int n;while((n=source.read(buffer))!=-1){if(out.size()+n>max)throw new IOException("Response too large");out.write(buffer,0,n);}return out.toByteArray();}}
  private void clearExport(){synchronized(exportLock){try{if(exportOutput!=null)exportOutput.close();}catch(IOException ignored){}exportOutput=null;if(exportFile!=null)exportFile.delete();exportFile=null;exportId=null;}}
  private void saveExport(Uri destination){new Thread(()->{try{File source;synchronized(exportLock){source=exportFile;}if(source==null)throw new IOException();try(InputStream input=new FileInputStream(source);OutputStream output=getContentResolver().openOutputStream(destination,"w")){if(output==null)throw new IOException();byte[] buffer=new byte[65536];int n;while((n=input.read(buffer))!=-1)output.write(buffer,0,n);}notice("FINDR export saved.");}catch(Exception e){notice("Export could not be saved. Your original records are unchanged; retry the export.");}finally{clearExport();}},"findr-export").start();}
  public final class NativeBridge {
    @JavascriptInterface public int version(){return 1;}
    @JavascriptInterface public void online(String id,String body,String key){
      if(!trustedPage||id==null||!id.matches("[a-zA-Z0-9-]{1,80}")||body==null||body.getBytes(java.nio.charset.StandardCharsets.UTF_8).length>262144||key==null||!key.matches("[\\x21-\\x7e]{16,512}")||onlineRequests.size()>=4||!onlineRequests.add(id))return;
      new Thread(()->{HttpURLConnection connection=null;try{connection=(HttpURLConnection)new URL(RELAY).openConnection();connection.setConnectTimeout(15000);connection.setReadTimeout(50000);connection.setInstanceFollowRedirects(false);connection.setRequestMethod("POST");connection.setDoOutput(true);connection.setRequestProperty("Content-Type","application/json");connection.setRequestProperty("Accept","application/json");connection.setRequestProperty("X-FINDR-Provider-Key",key);connection.setRequestProperty("User-Agent","FINDR Android (explicit online request)");onlineConnections.put(id,connection);if(!onlineRequests.contains(id))return;byte[] bytes=body.getBytes(java.nio.charset.StandardCharsets.UTF_8);connection.setFixedLengthStreamingMode(bytes.length);try(OutputStream out=connection.getOutputStream()){out.write(bytes);}int status=connection.getResponseCode();if(status>=300&&status<400)throw new IOException("Redirect refused");InputStream input=status>=400?connection.getErrorStream():connection.getInputStream();if(input==null)throw new IOException("Missing response");deliverOnline(id,status,connection.getContentType(),limited(input,524288));}catch(Exception e){deliverOnline(id,502,"application/json","{\"error\":{\"code\":\"ONLINE_NETWORK_ERROR\"}}".getBytes(java.nio.charset.StandardCharsets.UTF_8));}finally{onlineConnections.remove(id);if(connection!=null)connection.disconnect();}},"findr-online").start();
    }
    @JavascriptInterface public void cancelOnline(String id){onlineRequests.remove(id);HttpURLConnection connection=onlineConnections.remove(id);if(connection!=null)connection.disconnect();}
    @JavascriptInterface public String beginExport(String name,String mime,long size){synchronized(exportLock){if(!trustedPage||exportId!=null||size<0||size>getCacheDir().getUsableSpace()-10485760L)return "";try{exportFile=File.createTempFile("findr-export-",".tmp",getCacheDir());exportOutput=new FileOutputStream(exportFile);exportId=UUID.randomUUID().toString();exportName=name==null?"FINDR-export":name.replaceAll("[\\x00-\\x1f/\\\\]","-");exportMime=mime!=null&&mime.matches("[a-zA-Z0-9.+-]+/[a-zA-Z0-9.+-]+")?mime:"application/octet-stream";exportExpected=size;exportWritten=0;return exportId;}catch(Exception e){clearExport();return "";}}}
    @JavascriptInterface public boolean appendExport(String id,String part){synchronized(exportLock){if(!trustedPage||exportId==null||!exportId.equals(id)||exportOutput==null||part==null||part.length()>200000)return false;try{byte[] bytes=Base64.decode(part,Base64.DEFAULT);if(exportWritten+bytes.length>exportExpected)return false;exportOutput.write(bytes);exportWritten+=bytes.length;return true;}catch(Exception e){return false;}}}
    @JavascriptInterface public boolean finishExport(String id){synchronized(exportLock){if(!trustedPage||exportId==null||!exportId.equals(id)||exportWritten!=exportExpected)return false;try{exportOutput.close();exportOutput=null;Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT);intent.addCategory(Intent.CATEGORY_OPENABLE);intent.setType(exportMime);intent.putExtra(Intent.EXTRA_TITLE,exportName);runOnUiThread(()->{try{startActivityForResult(intent,8);}catch(Exception e){clearExport();notice("Save As is unavailable. Your records are unchanged.");}});return true;}catch(Exception e){clearExport();return false;}}}
    @JavascriptInterface public void cancelExport(String id){synchronized(exportLock){if(exportId!=null&&exportId.equals(id))clearExport();}}
  }
  @Override public void onBackPressed(){web.evaluateJavascript("document.querySelector('dialog[open]') ? (document.querySelector('[data-action=close-modal]').click(), true) : false",value->{if("true".equals(value))return;if(web.canGoBack())web.goBack();else finish();});}
  @Override public void onDestroy(){trustedPage=false;for(String id:new ArrayList<>(onlineRequests))new NativeBridge().cancelOnline(id);clearExport();if(chooser!=null){chooser.onReceiveValue(null);chooser=null;}if(web!=null){web.removeJavascriptInterface("FindrNative");web.destroy();web=null;}super.onDestroy();}
}
