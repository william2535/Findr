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

public class MainActivity extends Activity {
  private WebView web;
  private JSONObject downloads;
  private ValueCallback<Uri[]> chooser;
  private static final String HOST="appassets.androidplatform.net";
  @Override public void onCreate(Bundle saved) {
    super.onCreate(saved);
    getWindow().setStatusBarColor(Color.rgb(17,17,17)); getWindow().setNavigationBarColor(Color.rgb(17,17,17));
    try {downloads=new JSONObject(readAll(getAssets().open("www/data/download-map.json")));} catch(Exception e){downloads=new JSONObject();}
    web=new WebView(this);web.setBackgroundColor(Color.rgb(17,17,17));
    WebSettings settings=web.getSettings();settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);settings.setAllowFileAccess(false);settings.setAllowContentAccess(true);settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);settings.setMediaPlaybackRequiresUserGesture(true);settings.setUserAgentString(settings.getUserAgentString()+" FINDRAndroid/0.1");
    web.setOnApplyWindowInsetsListener((v,insets)->{v.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());return insets;});
    web.setWebViewClient(new WebViewClient(){
      @Override public WebResourceResponse shouldInterceptRequest(WebView v,WebResourceRequest r){
        Uri uri=r.getUrl();if(!HOST.equals(uri.getHost())||!"https".equals(uri.getScheme()))return null;
        String path=uri.getPath();
        try {
          if(path.startsWith("/api/manual/"))return manual(path.substring(12));
          if(!path.startsWith("/app/")||path.contains(".."))return error(404,"Not found");
          String file=path.substring(5);if(file.isEmpty())file="index.html";
          return new WebResourceResponse(mime(file),"UTF-8",200,"OK",Collections.singletonMap("Cache-Control","no-cache"),getAssets().open("www/"+file));
        }catch(Exception e){return error(404,"App file unavailable");}
      }
      @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){Uri u=r.getUrl();if(HOST.equals(u.getHost())&&"https".equals(u.getScheme())&&u.getPath().startsWith("/app/"))return false;if("https".equals(u.getScheme())||"http".equals(u.getScheme())){try{startActivity(new Intent(Intent.ACTION_VIEW,u));}catch(Exception ignored){}}return true;}
    });
    web.setWebChromeClient(new WebChromeClient(){@Override public boolean onShowFileChooser(WebView v,ValueCallback<Uri[]> callback,FileChooserParams params){if(chooser!=null)chooser.onReceiveValue(null);chooser=callback;Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT);i.addCategory(Intent.CATEGORY_OPENABLE);i.setType("application/pdf");try{startActivityForResult(i,7);return true;}catch(Exception e){chooser=null;return false;}}});
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
  private static String mime(String path){if(path.endsWith(".html"))return "text/html";if(path.endsWith(".mjs")||path.endsWith(".js"))return "text/javascript";if(path.endsWith(".json")||path.endsWith(".webmanifest"))return "application/json";if(path.endsWith(".css"))return "text/css";if(path.endsWith(".svg"))return "image/svg+xml";if(path.endsWith(".png"))return "image/png";if(path.endsWith(".jpg")||path.endsWith(".jpeg"))return "image/jpeg";if(path.endsWith(".wasm"))return "application/wasm";return "application/octet-stream";}
  @Override protected void onActivityResult(int request,int result,Intent data){super.onActivityResult(request,result,data);if(request==7&&chooser!=null){chooser.onReceiveValue(result==RESULT_OK&&data!=null?new Uri[]{data.getData()}:null);chooser=null;}}
  @Override public void onBackPressed(){web.evaluateJavascript("document.querySelector('dialog[open]') ? (document.querySelector('[data-action=close-modal]').click(), true) : false",value->{if("true".equals(value))return;if(web.canGoBack())web.goBack();else finish();});}
  @Override public void onDestroy(){if(web!=null)web.destroy();super.onDestroy();}
}
