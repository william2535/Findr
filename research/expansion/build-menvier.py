"""Rebuild the Menvier menu atlas from reviewed manufacturer-manual labels.
Original explanatory prose and explicit simulation adapters; no source PDF assets.
"""
from pathlib import Path
import json,hashlib,re
ROOT=Path(__file__).resolve().parents[2]
SRC=Path('/tmp/menvier-source')
E='https://www.ukwatchsecurity.co.uk/engineer-manuals/Manuals/Menvier%20M%20Series%20Engineering%20Manual.pdf'
U='https://bw-tech.co.uk/guides/eaton-menvier-m800-m2000-managers-guide.pdf'
K='https://bw-tech.co.uk/guides/eaton-menvier-m800-m2000-user-guide.pdf'
fingerprints={'engineering.pdf':'6f4f3a6b9f9996e7a32c8b48b64715922ccd98506b93e1ee30ac9d1265536923','manager.pdf':'7299e5774bf06bcde43820cef438635a365278dd9446b61b7e6db60832fd566a','user.pdf':'82606a42ec328a1a64344900f23765fb88606b75d3de8d23061750eb5a6663e9'}
def fingerprint(filename):
 expected=fingerprints[filename]
 if (SRC/filename).exists():
  actual=hashlib.sha256((SRC/filename).read_bytes()).hexdigest()
  if actual!=expected:raise ValueError('Source has changed; review before rebuilding: '+filename)
 return expected
sources=[dict(id='eng5',title='M-Series Engineering Manual',edition='496966 Issue 5; Cooper Security 2005–2006',url=E,publisher='Cooper Security / Menvier',totalPdfPages=140,sha256=fingerprint('engineering.pdf'),pageNumbering='Printed Arabic page + 2 = one-based PDF page.',scope='M750/M800 subset of the older M-Series manual. No firmware version is asserted; this is not the later Menvier30/40/100/300 family.'),dict(id='manager2010',title='M2000/M800 Manager’s Manual',edition='Part 11821957; PDF metadata created January 2010',url=U,publisher='Cooper Security / Menvier',totalPdfPages=76,sha256=fingerprint('manager.pdf'),pageNumbering='Printed Arabic page + 2 = one-based PDF page.',scope='Separate later M800 Manager baseline. Calendar timers differ from the older engineer guide; user and engineer roots are not merged.'),dict(id='keypad',title='M2000/M800 User’s Guide',edition='Part 12062453; 2010 copyright; keypad diagram printed p3',url=K,publisher='Cooper Security / Menvier',totalPdfPages=28,sha256=fingerprint('user.pdf'),pageNumbering='Printed Arabic page + 2 = one-based PDF page.',scope='Open-flap classic M Series keypad illustration and physical key names only.')]
nodes=[];by={};gaps=[]
def refs(page,source='eng5'):
 return [dict(sourceId=source,printedPage=str(page),pdfPage=int(page)+2)]
def add(id,parent,label,page,code=None,kind='menu',source='eng5',summary='',aliases=None,conditions=None,sim=None,notes=None):
 n=dict(id=id,parentId=parent,order=sum(x['parentId']==parent for x in nodes)+1,label=label,code=str(code) if code is not None else None,kind=kind,access='Manager' if source=='manager2010' else 'Engineer',summary=summary or {'menu':'Select this documented menu or procedure.','setting':'Edit this field for the selected fictional record.','status':'Read this documented status display using simulated site data.','command':'Documented operation; FINDR acts only on fictional data.','selection':'Documented selectable value in this field.','reference':'Documented reference; exact interactive behaviour is not reproduced.'}[kind],aliases=aliases or [],conditions=conditions or [],sourceRefs=refs(page,source),notes=notes or [],practiceTaskIds=[])
 if code is not None:n['codeType']='value' if kind=='selection' else 'parameter' if kind=='setting' else 'menu'
 if kind not in ['selection','reference'] and id.startswith('m-e') and re.match(r'^m-e[12](?:\.\d+)+$',id):n['address']=id[3:]
 if kind not in ['selection','reference'] and id.startswith('m-u') and re.match(r'^m-u[12](?:\.\d+)+$',id):n['address']=id[3:]
 if sim:n['simulation']=sim
 nodes.append(n);by[id]=n;return n

def enum(id,parent,label,page,values,code=None,source='eng5',sim=None,notes=None,aliases=None):
 n=add(id,parent,label,page,code,'setting',source,aliases=aliases,notes=notes,sim={'mode':'choice',**(sim or {})})
 for i,item in enumerate(values):
  c,l=item if isinstance(item,tuple) else (None,item)
  add(id+'-v'+str(i),id,l,page,c,'selection',source)
 return n

def flags(id,parent,label,page,values,code=None,source='eng5',sim=None):
 n=add(id,parent,label,page,code,'setting',source,sim={'mode':'flags','toggleKeys':['change'],**(sim or {})})
 for i,item in enumerate(values):
  c,l=item if isinstance(item,tuple) else (None,item)
  add(id+'-v'+str(i),id,l,page,c,'selection',source)
 return n

def textfield(id,parent,label,page,code=None,source='eng5',length=16,**kw):
 return add(id,parent,label,page,code,'setting',source,sim={'mode':'text','maxLength':length,'textMode':'helper',**kw},notes=['FINDR’s text-entry helper supplies the editable text. The physical multi-tap character sequence is not reproduced; ENT saves and ESC discards the draft.'])
def number(id,parent,label,page,code=None,source='eng5',minimum=0,maximum=999,units='',**kw):
 return add(id,parent,label,page,code,'setting',source,sim={'mode':'number','min':minimum,'max':maximum,'units':units,**kw})
def clock(id,parent,label,page,code,source='eng5',date=False):
 return textfield(id,parent,label,page,code,source,length=6 if date else 4,textMode='digits',format='date-short' if date else 'time')
def info(id,parent,label,page,code=None,source='eng5',reason='The exact hardware procedure is documented but is not emulated.',**kw):
 return add(id,parent,label,page,code,'reference',source,sim={'mode':'info','include':True,'evidenceNote':reason},**kw)
def status(id,parent,label,page,code=None,source='eng5',lines=None,**kw):
 return add(id,parent,label,page,code,'status',source,sim={'mode':'status','displayLines':lines or [label,'FINDR demo'],**kw})
def action(id,parent,label,page,code=None,source='eng5',name='unsupported',**kw):
 return add(id,parent,label,page,code,'command',source,sim={'mode':'action','action':name,**kw})
def gap(id,title,question,ids,reason):
 gaps.append(dict(id=id,title=title,question=question,reason=reason,priority='medium',affectedNodeIds=ids,neededEvidence='Matching panel model and firmware display, then a photograph or video of this specific menu.'))
wardvalues=[(str(i),'Ward '+str(i)) for i in range(1,5)]
seq={'sequentialFields':True,'immediateFields':True,'advanceOnSave':True,'previousFieldKey':'back','sequenceEnd':'selector'}
add('m-engineer',None,'Engineer levels',21,sim={'mode':'menu'})
add('m-e1','m-engineer','Engineer Menu 1',23,'1')
add('m-e2','m-engineer','Engineer Menu 2',82,'2')
for c,l,p in [(1,'Program Zones',24),(2,'Zones Advanced',33),(3,'Ward Options',35),(4,'Outputs',39),(5,'Timers',56),(6,'Setting Modes',65),(7,'Custom Text',67),(8,'Group Options',69),(9,'Configuration',73)]:add('m-e1.'+str(c),'m-e1',l,p,c)
info('m-e1.0','m-e1','Goto User Menu 1',81,0,reason='This engineering edition refers to a contemporary Manager’s Manual. FINDR’s separately labelled 2010 Manager session is available in Access menu; the later user menu is not silently substituted here.')
# Program Zones is an actual sequential wizard, not four numbered child menus.
by['m-e1.1']['simulation']={'mode':'menu','selector':'zone','scope':'zone',**seq}
ztypes=[('0','Not Used'),('1','Normal Alm'),('2','24 Hour'),('3','PA Silent'),('4','PA Audible'),('5','Fire'),('6','Technical'),('7','Final Exit'),('8','Exit Term'),('9','Entry')]+[(None,l) for l in ['Keyswitch','Shunt Key','Tamper','Perimeter','Lock Set','PSU Battery','PSU Fuse','PSU Power','Masking','Occupancy','Security']]
enum('m-zone-type','m-e1.1','Zone Type',26,ztypes,sim={'bind':'zoneType'},aliases=['detector type','program PIR','entry exit zone'])
attrs=[(str(i+1),l) for i,l in enumerate(['Access','Double Knock','Soak Test','Omittable','Reset','Masking','Entry','Chime Tone 1','Chime Tone 2'])]+[(None,l) for l in ['Chime Tone 3','Inverted','Shuntable','Beam Pair','Monitored','Non Latching']]
flags('m-zone-attributes','m-e1.1','Zone Attributes',30,attrs,sim={'defaultValue':{'m-zone-attributes-v3':True},'digitSelectOnly':True})
flags('m-zone-wards','m-e1.1','Zone Wards',32,wardvalues,sim={'defaultValue':{'m-zone-wards-v0':True}})
textfield('m-zone-description','m-e1.1','Description',32,bind='zoneName')
by['m-e1.2']['simulation']={'mode':'menu','selector':'zone','scope':'zone',**seq}
enum('m-zone-resistor','m-e1.2','Resistance',33,[(str(i+1),l) for i,l in enumerate(['4K7 / 2K2','1K0 / 1K0','4K7 / 4K7','2K2 / 2K2'])],sim={'defaultValue':'4K7 / 2K2','evidenceNote':'The selected configuration is stored. FINDR’s four detector fixtures keep their stated 4K7/2K2 readings; a full electrical threshold model is not implemented.'},aliases=['end of line','EOL','resistor setting'])
enum('m-zone-output-group','m-e1.2','Set Output Group',34,[('00','None')]+[(str(i).zfill(2),'Group '+str(i)) for i in range(1,5)],notes=['FINDR provides four fictional output groups. The source states 00 removes the assignment but does not give the full accepted group range.'])
add('m-e1.3.1','m-e1.3','Equipment to Wards',35,1,sim={'selector':'equipment','scope':'equipment'})
flags('m-equipment-wards','m-e1.3.1','Ward',35,wardvalues)
add('m-e1.3.2','m-e1.3','Attributes',36,2)
wardattrs=['Conf Reset','Unconf Reset','Tamper Reset','Remote Reset','Panel Tamper','Panel Speaker','Bell Tamp','Payment Timer','Re-arms','Secure Ward','Bell & Strobe','Foyer Mode','Unset Fire','Multiply Ack']
for i,l in enumerate(wardattrs):flags('m-ward-attribute-'+str(i+1),'m-e1.3.2',l,36 if i<2 else 37 if i<10 else 38,wardvalues,str(i+1).zfill(2))
# Shared output fields: one source template, used by real output-type selectors.
for c,l in [(1,'Panel'),(2,'Digi H/Wired'),(3,'Digi On Board'),(4,'Equipment'),(5,'O/M Modules'),(6,'Custom Outputs')]:
 add('m-e1.4.'+str(c),'m-e1.4',l,39 if c<6 else 40,c,sim={'selector':'output','scope':'output'})
parent='m-e1.4.1'
enum('m-output-follows',parent,'Output Type',42,[(str(i+1),l) for i,l in enumerate(['System','Ward','Zone','User','Group'])],sim={'defaultValue':'System'})
add('m-output-events',parent,'System Type',43,kind='setting',sim={'mode':'choice'},conditions=['Applies when Output Type is System.'],aliases=['output function','relay function','bell output'])
system={0:'Bell (SAB)',1:'System Strobe',2:'Switch 12 Volts',3:'Detector.Reset',4:'Walk Test',5:'Alarm',6:'Panic Alarm (PA)',7:'Fire Alarm',8:'System Set',9:'System Full Set',10:'System Open',11:'Confirmed',12:'Courtesy Light',13:'Engineer On Site',14:'Active Omit',15:'Zones Omitted',16:'24 Hour Omitted',17:'24 Hour Alarm',18:'Zones Shunted',19:'Technical',20:'PSTN Line Fault',21:'Mains Power Off',22:'Access Code',23:'Soak Test Fail',24:'First Knock',25:'Digi Failed',26:'Digi Successful',27:'Digi Active',28:'2nd Entry Only',29:'Entry Only',30:'Exit Only',31:'Exit / Entry',32:'Exit Fault',33:'Tamper Alarm',34:'Rem Service Call',35:'Code Accepted',36:'Service Required',37:'Reset Required',38:'Strobe On Set',39:'Duress Alarm',40:'System Part Set',41:'LockSet Unlocked',42:'Set Failed',43:'Shunt Code',44:'Random Output On',45:'Modem Lockout',46:'Bell Tamper',47:'Panel Lid Tamper',48:'Chime Mimic',49:'Monitored O/P On',50:'Alarm Abort',51:'Rem Call Enabled',52:'Relearn Required',53:'Always On',54:'Always Off',55:'Battery Test On',56:'Battery Fault',57:'PSU - Battery',58:'PSU - Fuse',59:'PSU - Power',60:'General Fault',61:'Mask Tamper',62:'Mask Fault',65:'Pending',66:'ID Loop Shorted',67:'Ext Line Fault',68:'ATS Test',69:'Always Off',70:'Auxiliary Fuse',71:'Bell Fuse',72:'Network 1 Fuse',73:'Network 2 Fuse',80:'Rem Batt Fault',81:'Rem Mains Off',82:'Rem Pwr Out Flt',83:'Sys Batt Fault',84:'Sys Mains Fault',100:'Auto-Setting'}
for base,count,fmt in [(101,3,'Auto-Set Timer {}'),(109,4,'PC Output {} On'),(119,8,'Custom O/P {} On'),(129,3,'Time Switch {} On'),(139,3,'Code Lock {} On')]:
 for i in range(count):system[base+i]=fmt.format(i+1)
for c,l in system.items():add('m-system-output-'+str(c),'m-output-events',l,126,str(c).zfill(3),'selection')
wardevents=['Bell-SAB','Strobe','Switch 12','Det.Reset','Walk Test','Alarm','P.A Alarm','Fire Alm.','Set','2nd Entry','24Hr Alm.','Cnf Alarm','Zone Omit','Act.Omit','24Hr Omit','Set Fail','Settling','Clear','Tamper','Reset Req','Lock-Out','Chime On','Monitor','Alm Abort','Entry','Exit','Exit/Ent.','Exit Flt','Sndr Ctl.','Perimeter','Shunted','AlwaysOff','SetStrobe','Access','LS Open','PSU Batt','PSU Fuse','PSU Mains','Mask Tamp','Mask Flt','Auto Set']
enum('m-output-ward-event',parent,'Ward Type',51,[(str(i).zfill(2),l) for i,l in enumerate(wardevents)],sim={'selector':'ward','scope':'output'},notes=['Conditional on Output Type = Ward. FINDR exposes the conditional field for inspection; connected output logic is not executed.'])
enum('m-output-zone-event',parent,'Zone OP Type',55,[(str(i+1),l) for i,l in enumerate(['Mimic','Alarm','Tamper','Test Fail','Omit'])],sim={'selector':'zone','scope':'output'},notes=['Conditional on Output Type = Zone.'])
enum('m-output-inversion',parent,'Output Inversion',55,['Normal','Invert'])
enum('m-output-mode',parent,'Output Mode',55,['Latched','Pulsed'])
for i in range(2,6):by['m-e1.4.'+str(i)]['simulation'].update(children=[n['id'] for n in nodes if n['parentId']=='m-e1.4.1'],include=True,evidenceNote='Output bank records are fictional. The documented System/Ward/Zone source fields can be edited, but their conditional wizard order is simplified.')
info('m-custom-gates','m-e1.4.6','Custom output gates',40,reason='Custom outputs combine eight OR/AND gates. The source map is retained; FINDR does not pretend the shared single-output fields implement the gate expression.')
for i in range(1,9):add('m-custom-gate-'+str(i),'m-custom-gates','Gate '+str(i)+' ('+('OR' if i<=4 else 'AND')+')',40,str(i),'reference')
# Timers, modes, names and groups.
for i,l,p in [(1,'Ward Timers',56),(2,'System Timers',58),(3,'Time Switches',62),(4,'Auto-Sets',63),(5,'Code Locks',64)]:add('m-e1.5.'+str(i),'m-e1.5',l,p,i)
for i,(l,u) in enumerate([('Exit','seconds'),('Entry Delay','seconds'),('Bell Delay','minutes'),('Bell Duration','minutes')]):
 n=add('m-ward-timer-'+str(i+1),'m-e1.5.1',l,57,i+1,'setting',sim={'mode':'number','selector':'ward','scope':'ward','min':0,'max':999,'units':u,'evidenceNote':'FINDR uses the illustrated three-digit training field (000–999). The manual does not establish each firmware-specific accepted bound.'})
timerlabels=['Confirmation','Sys Bell Dly','Sys Bell Dur','Anti Mask','Line Fault','AC Off Delay','Soak Test','Exit Settle','2nd Entry Dly','Double Knock','Abort Period','Abort Delay','Courtesy Time','Menu Time-Out','Beam Pair','Defer Setting','Service Time','Select Menu','Keys Til Tamp','No. of Rearms','Remote Resets','Double Knocks','Tst Call Strt','Test Call Int','Reset Alg.','Payment Time','Hi Security']
for i,l in enumerate(timerlabels):
 p=58 if i<2 else 59 if i<13 else 60 if i<21 else 61
 add('m-system-timer-'+str(i+1),'m-e1.5.2',l,p,str(i+1).zfill(2),'setting',sim={'mode':'number','min':0,'max':999,'evidenceNote':'Three-digit FINDR training editor, matching the illustrated input width. Individual timer limits are not asserted as hardware-verified.'})
for id,p,scope in [('m-e1.5.3',62,'timeSwitch'),('m-e1.5.4',63,'autoSet'),('m-e1.5.5',64,'codeLock')]:
 by[id]['simulation']={'selector':scope,'scope':scope,'numericSelection':False,'evidenceNote':'On/off and day fields are scrolled, not numbered submenus. FINDR presents the documented field set; the complete timed physical display flow is simplified.'}
 for period in range(1,4):
  clock(id+'-on'+str(period),id,'On ('+str(period)+')',p,None);clock(id+'-off'+str(period),id,'Off ('+str(period)+')',p,None)
 for period in range(1,4):
  flags(id+'-days'+str(period),id,'Days ('+str(period)+')',p,[(str(i+1),d) for i,d in enumerate(['Sun','Mon','Tue','Wed','Thu','Fri','Sat'])])
 if scope=='autoSet':flags(id+'-wards',id,'Wards',p,wardvalues)
 if scope=='codeLock':info(id+'-users',id,'Allocated users',p,reason='The older guide delegates detailed code-lock user allocation to its matching Manager manual. The later manager baseline is kept separate.')
settingmodes=[(str(i+1),l) for i,l in enumerate(['Final Exit','Exit Terminate','Timed Exit','Instant Set','Deferred Set','Lock Set'])]
by['m-e1.6']['simulation']={'mode':'choice','selector':'ward','scope':'ward'}
for i,(c,l) in enumerate(settingmodes):add('m-setting-mode-'+c,'m-e1.6',l,65 if i<3 else 66,c,'selection')
for i,l in enumerate(['Reset Message','Location Text','Printer Title','Remote Reset Msg','Banner Text','Group Names','Aux. Tamper']):
 textfield('m-custom-text-'+str(i+1),'m-e1.7',l,67 if i<5 else 68,i+1,selector='group' if i==5 else 'tamper' if i==6 else None,scope='group' if i==5 else 'tamper' if i==6 else None)
for c,l,p in [(1,'Assign Groups',69),(2,'Exit Modes',70),(3,'Group Timers',71),(4,'Alarm Response',72)]:add('m-e1.8.'+str(c),'m-e1.8',l,p,c,sim={'selector':'group','scope':'group'})
flags('m-group-wards','m-e1.8.1','Wards',69,wardvalues)
by['m-e1.8.2']['simulation'].update(mode='choice')
for c,l in settingmodes+[('7','Silent Set')]:add('m-group-mode-'+c,'m-e1.8.2',l,70,c,'selection')
for i,(l,u) in enumerate([('Exit','seconds'),('Entry Delay','seconds'),('Bell Delay','minutes'),('Bell Duration','minutes')]):number('m-group-timer-'+str(i+1),'m-e1.8.3',l,71,i+1,units=u,scope='group',evidenceNote='Illustrated three-digit training input; exact allowed bound needs installed-firmware confirmation.')
by['m-e1.8.4']['simulation'].update(mode='choice')
for i,l in enumerate(['Full','Local','Internal']):add('m-group-response-'+str(i+1),'m-e1.8.4',l,72,i+1,'selection')
for c,l,p in [(1,'General',73),(2,'DD243',77),(3,'EN50131',79)]:add('m-e1.9.'+str(c),'m-e1.9',l,p,c)
general=['Ward OFF|Ward ON','Bell is an SAB|Bell is an SCB','View Alms Unset|View Alms P.set','Engr Authorised|User Authorised','On-Line Enabled|On-Line Disabled','Unset Ward First|Set Ward First','Digi Normal|Digi Inverted','Chime Audible|Chime Visible','Manual Omits|Automatic Omits','Omit Tampers No|Omit Tampers Yes','Global Setting|Local Setting','Global Unsetting|Local Unsetting','24hr Omit Global|24hr Omit Local','Ward Bell Time|Global Bell Time','Latching Fire|Nonlatching Fire','Timed code o/p|Latched code o/p','Latching 24hr|Nonlatching 24hr','Access code only|Access all codes','NVM is Unlocked|NVM is Locked','Unshunt, no exit|Unshunt & exit','Ignore errors|View exit errors','Mimic, All times|Mimic, Set only','Lo Security Eng.|Hi Security Eng.','Duress Allow NO|Duress Allow YES','Keypad PA OFF|Keypad PA ON','P.Set Hotkey YES|P.Set Hotkey NO','Exit Foyer|Inst Set Foyer']
dd=['Confirmation On|Confirmation Off','Sndrs on Unconf|Sndrs on Confirm','Bells on Unconf|Bells on Confirm','After Entry No|After Entry Yes','Ent KPD Lock Off|Ent KPD Lock On','Confirm 2 Zones|Confirm 1 Zone']
en=['4 Digit Codes|6 Digit Codes','Internal Sounder|Local Sounder','Int Sounder Inst|Int Sounder Dly','Instant Alarm|Delayed Alarm','Tampers As Alarm|Tampers As Tamps','Mask Unset Fault|Mask Unset Tamp','Mask Set Fault|Mask Set Tamper','Mask Override|Mask Inhibit','User|Eng','No Reset|User|Engineer','Always|Healthy|Never','No Rst|User|Eng','Always|User|Eng']
for group,items,base in [(1,general,73),(2,dd,77),(3,en,79)]:
 for i,v in enumerate(items):
  page=(73 if i<4 else 74 if i<11 else 75 if i<18 else 76 if i<25 else 77) if group==1 else (77 if i<3 else 78) if group==2 else (79 if i<5 else 80 if i<10 else 81)
  label=('Gen/fault' if i==8 else 'AC Fail' if i==9 else 'AC Bypass' if i==10 else 'Line Fail' if i==11 else 'LF Bypass' if i==12 else v.replace('|',' / ')) if group==3 else v.replace('|',' / ')
  enum(f'm-e1.9.{group}.{i+1}',f'm-e1.9.{group}',label,page,v.split('|'),str(i+1).zfill(2))
# Engineer 2 diagnostics and communications.
for c,l,p in [(1,'View Zones',83),(2,'Time and Date',84),(3,'Volume Control',85),(4,'Change passcode',85),(5,'Communications',86),(6,'Alter Shunt Groups',100),(7,'Built In Tests',101),(8,'Log Functions',116)]:add('m-e2.'+str(c),'m-e2',l,p,c)
by['m-e2.1']['simulation']={'mode':'zones','numericSelection':True,'showResistance':False,'networkKey':'change'}
by['m-e2.1']['aliases']=['zone status','is detector open','tamper status']
clock('m-e2.2.1','m-e2.2','Set Time',84,1);clock('m-e2.2.2','m-e2.2','Set Date',84,2,date=True)
by['m-e2.3']['simulation']={'mode':'number','min':0,'max':7,'evidenceNote':'The older engineer guide permits Sound Off and numerical volume but does not state its full range. FINDR uses a 0–7 training range, explicitly documented only in the later M800 Manager guide p11.'}
textfield('m-engineer-code','m-e2.4','Code',85,1,length=6,textMode='digits',minLength=4)
textfield('m-engineer-name','m-e2.4','Name',85,2)
for c,l,p in [(1,'Downloader',86),(2,'DigiCom',91),(3,'Start CallBack',98),(4,'RS232 Options',99)]:add('m-e2.5.'+str(c),'m-e2.5',l,p,c)
textfield('m-e2.5.1.1','m-e2.5.1','Password',87,1,length=16)
textfield('m-e2.5.1.2','m-e2.5.1','Site ID',87,2,length=12)
enum('m-e2.5.1.3','m-e2.5.1','Access Mode',88,[(str(i+1),l) for i,l in enumerate(['Off','Secure Call Back','Unattended'])],3)
textfield('m-e2.5.1.4','m-e2.5.1','Edit Call Nos.',89,4,length=32,textMode='telephone',selector='phone',scope='phone')
add('m-e2.5.1.5','m-e2.5.1','Modem Options',90,5)
for c,id,l,vs in [(1,'rings','Rings To Answer',['Immediate','1 Second','2 Seconds','3 Seconds','5 Seconds','10 Seconds','20 Seconds','Never']),(2,'baud','Baud Rate',['300','1200','2400']),(3,'answer','Ans Phone Defeat',['Disabled','Enabled'])]:enum('m-downloader-'+id,'m-e2.5.1.5',l,90,[(str(i+1),x) for i,x in enumerate(vs)],c)
enum('m-e2.5.2.1','m-e2.5.2','Comms Format',91,[(str(i+1),l) for i,l in enumerate(['Disabled','Fast Format','Contact ID','SIA 1','SIA 2','SIA 3','Extended SIA 3'])],1)
textfield('m-e2.5.2.2','m-e2.5.2','ARC No.',95,2,length=32,textMode='telephone',selector='arc',scope='arc',evidenceNote='Three ARC telephone records. The 32-character editor is a FINDR fixture bound, not a verified panel limit.')
textfield('m-e2.5.2.3','m-e2.5.2','Account Numbers',96,3,length=6,textMode='digits',selector='account',scope='account',evidenceNote='Eight numbered account records. The editor length is a FINDR fixture bound; the accepted account length depends on reporting format.')
enum('m-e2.5.2.4','m-e2.5.2','Dialling Mode',96,[(str(i+1),l) for i,l in enumerate(['Consecutive','Alternate','All'])],4)
add('m-e2.5.2.5','m-e2.5.2','Options',97,5)
for i,(l,vs) in enumerate([('Restore Signals',['Disabled','Enabled']),('Fast Format',['8 FF Channels','16 FF Channels']),('Line Fault',['Disabled','Enabled'])]):enum('m-digicom-option-'+str(i+1),'m-e2.5.2.5',l,97 if i<2 else 98,vs,i+1)
enum('m-e2.5.2.6','m-e2.5.2','CID/SIA Reports',98,[(str(i+1),l) for i,l in enumerate(['Full','Intermediate','Summary','Basic','Custom'])],6)
by['m-e2.5.3']['kind']='command';by['m-e2.5.3']['simulation']={'mode':'action','action':'unsupported','resultText':'Callback location reached. FINDR has no dialler or remote transport.'}
info('m-e2.5.4.1','m-e2.5.4','RS232 Baud · M1000 only',99,1,reason='This source option is explicitly M1000-only. It is shown as a compatibility reference, not an editable M750/M800 field.',conditions=['M1000 only; unavailable in the M750/M800 baseline.'])
info('m-e2.5.4.2','m-e2.5.4','Remote Modem',99,2,reason='The manual describes a WebWayOne enable control and names Disable, but does not show the full screen or selector labels. The editor remains unverified; there is no remote transport.')
by['m-e2.6']['simulation']={'mode':'menu','selector':'shunt','scope':'shunt'}
flags('m-shunt-zones','m-e2.6','Zones',100,[(str(i),'Zone '+str(i).zfill(4)) for i in range(1,5)],sim={'evidenceNote':'The fictional group contains four example zones. All zones in a shunt group must be in one ward; FINDR does not implement cross-ward shunt logic.'})
for c,l,p in [(1,'Power Supply',102),(2,'Outputs',103),(3,'Equipment',106),(4,'System Inputs',114),(5,'Fuses',115),(6,'Battery',115)]:add('m-e2.7.'+str(c),'m-e2.7',l,p,c)
for i,(l,v) in enumerate([('Panel Voltage','13.72 Volts'),('Battery Voltage','13.54 Volts'),('Charge Voltage','13.60 Volts'),('Charge Current','0.080 A'),('Discharge Current','0.000 A'),('Load Current','0.330 A'),('Source Current','0.000 A')]):status('m-power-'+str(i+1),'m-e2.7.1',l,102,i+1,lines=[l,v])
for i,l in enumerate(['Panel','Digi H/Wired','Digi On Board','Equipment']):
 add('m-e2.7.2.'+str(i+1),'m-e2.7.2',l,103 if i==0 else 104 if i<3 else 105,i+1,kind='command',sim={'mode':'outputs','outputs':['Output 1','Output 3','Output 4'] if i==0 else ['Channel '+str(j) for j in range(1,9)] if i<3 else ['1011 Remote','1012 Remote'],'toggleKeys':['change'] if i==3 else [],'outputToggleCodes':({'1':'Output 1','3':'Output 3','4':'Output 4'} if i==0 else {str(j):'Channel '+str(j) for j in range(1,9)} if i<3 else {}),'evidenceNote':'M750/M800 panel outputs are 1, 3 and 4. Digital tests expose the first eight fictional channels; bank switching and remote-device discovery are not reproduced.'})
for i,l,p in [(1,'Software Version',106),(2,'False Setting',107),(3,'Confirm Devices',108),(4,'Zone Resistance',108),(5,'Network Devices',109),(6,'Network Errors',109),(7,'Default User 1',110),(8,'Default NVM',110),(9,'Test Display',114)]:add('m-e2.7.3.'+str(i),'m-e2.7.3',l,p,i)
by['m-e2.7.3.1']['simulation']={'mode':'status','displayLines':['M800 FINDR DEMO','Manual 496966 I5'],'evidenceNote':'Fictional identity; no installed firmware has been measured.'}
by['m-e2.7.3.2']['simulation']={'mode':'info','evidenceNote':'The multi-stage false-set workflow is mapped in the manual; selecting wards, isolated zones and output inhibition requires a dedicated adapter and is not simulated.'}
by['m-e2.7.3.3']['simulation']={'mode':'status','statusRows':[{'label':'Keypads','value':'2 fitted (demo)'},{'label':'Nodes','value':'1 fitted (demo)'}],'evidenceNote':'A simulated inventory. ENT does not discover or adopt real hardware.'}
by['m-e2.7.3.4']['simulation']={'mode':'zones','numericSelection':True,'showResistance':True,'resistanceAlways':True,'networkKey':'change'}
by['m-e2.7.3.4']['aliases']=['zone resistance','ohms','resistor reading','check loop']
by['m-e2.7.3.5']['simulation']={'mode':'status','statusRows':[{'label':'1,01 Remote','value':'A-H B-H T-H'},{'label':'2,01 XNode','value':'13.75 FH TH HH**'}],'evidenceNote':'Status tokens are sourced; these devices and voltages are fictional.'}
by['m-e2.7.3.6']['simulation']={'mode':'status','statusRows':[{'label':'Network 1','value':'0000 errors'},{'label':'Network 2','value':'0003 errors'}],'evidenceNote':'FINDR readout only. The real 0-key error-counter reset is not reproduced.'}
by['m-e2.7.3.7']['simulation']={'mode':'info','evidenceNote':'Credential defaulting is referenced only; FINDR starts with authorised access and does not store factory codes.'}
for c,l in [(0,'Custom Text?'),(1,'Modem Data?'),(2,'User Codes?'),(3,'Configuration?'),(4,'Outputs?'),(5,'Setting Modes?'),(6,'System Timers?'),(7,'Time Switches?'),(8,'Code Locks?'),(9,'Autoset Times?'),(None,'Zones?'),(None,'Equipment Wards'),(None,'Net Equipment?'),(None,'Ward Groups?')]:info('m-default-'+re.sub('[^a-z0-9]+','-',l.lower()).strip('-'),'m-e2.7.3.8',l,110,c,reason='Documented reset category. No factory reset or user-data deletion is performed by this training location.')
by['m-e2.7.3.9']['simulation']={'mode':'status','displayLines':['8888888888888888','8888888888888888']}
for i,l in enumerate(['PSTN Line Status','Ext L.F. Status','Panel Lid Tamper','Bell Tamper','Mains Supply']):status('m-system-input-'+str(i+1),'m-e2.7.4',l,114,i+1,lines=[l,'PASS (demo)'])
for i,l in enumerate(['Auxiliary','Bell','Network 1','Network 2']):status('m-fuse-'+str(i+1),'m-e2.7.5',l,115,i+1,lines=[l+' Fuse','Healthy (demo)'])
by['m-e2.7.6']['simulation']={'mode':'status','displayLines':['Battery','12.80 Volts'],'evidenceNote':'Fictional charger-off battery reading; no electrical test is carried out.'}
for c,l,p in [(1,'View Log',116),(2,'Print Log',117),(3,'View Access Log',117),(4,'Print Access Log',118),(5,'System Print',118)]:
 add('m-e2.8.'+str(c),'m-e2.8',l,p,c,kind='status' if c in [1,3] else 'command',sim={'mode':'log','detailsKey':'change','reverseLogScroll':True} if c in [1,3] else {'mode':'action','action':'print','evidenceNote':'FINDR prepares a local fictional report. Printer number/offset prompts and online-print mode are not emulated.'})
# Later M800 Manager roots are deliberately source-separated.
add('m-manager',None,'Manager levels · 2010',2,source='manager2010')
add('m-u1','m-manager','User Menu 1',3,1,source='manager2010')
add('m-u2','m-manager','User Menu 2',16,2,source='manager2010')
for c,l,p in [(1,'Test Menu',3),(2,'Omit Zones',7),(3,'Shunt 24hr Zones',8),(4,'Change Code',9),(5,'Enable Chime',10),(6,'Volume Control',11),(7,'Customise Text',12),(8,'Silent Set Wards',13),(9,'Engineer Access',14),(0,'Set/Unset Menu',15)]:add('m-u1.'+str(c),'m-u1',l,p,c,source='manager2010')
for c,l,p in [(1,'Bell Test',3),(2,'Walk Test',4),(3,'Telecmd Batts',5),(4,'Telecmd Test',6)]:add('m-u1.1.'+str(c),'m-u1.1',l,p,c,source='manager2010')
by['m-u1.1.1']['simulation']={'mode':'outputs','outputs':['Bell','Strobe','Internal sounder'],'toggleKeys':['enter'],'evidenceNote':'FINDR uses individual output toggles. The physical bell/strobe sequence and ward mask are described in the source but simplified here.'}
by['m-u1.1.2']['simulation']={'mode':'walk','finishKey':'back','evidenceNote':'The fictional test includes all four demo detectors in Ward 1. Multi-ward selection and the physical post-test zone list are simplified.'}
by['m-u1.1.3']['simulation']={'mode':'status','displayLines':['Telecmd Batts','No batteries low'],'evidenceNote':'No radio devices are fitted; this is a fixture display.'}
by['m-u1.1.4']['simulation']={'mode':'status','statusRows':[{'label':'2:01:1 RNode','value':'9(5) Bat-H'}],'evidenceNote':'Invented telemetry. No radio reception is measured.'}
by['m-u1.2']['simulation']={'mode':'omit','toggleKeys':['change'],'finishKey':'back','recordAdvanceKey':'enter','numericSelection':True,'eligibleOnly':True}
by['m-u1.2']['aliases']=['disable device','bypass detector','isolate sensor','restore detector','reinstate zone']
for c,l in [(1,'Shunt 24Hr'),(2,'Reinstate 24hr')]:info('m-u1.3.'+str(c),'m-u1.3',l,8,c,'manager2010',reason='This ward-wide 24-hour shunt operation is distinct from ordinary zone omission. It is mapped but not activated in FINDR.')
by['m-u1.4']['simulation']={'mode':'text','textMode':'digits','minLength':4,'maxLength':4,'evidenceNote':'The fictional site uses four-digit user codes. No factory credentials are provided. Exact duplicate-code checks are not reproduced.'}
for node_id in ['m-u1.5','m-u1.8']:
 by[node_id]['simulation']={'mode':'flags','toggleKeys':['change'],'choices':[{'id':'ward'+str(i),'code':str(i),'label':'Ward '+str(i),'value':'ward'+str(i)} for i in range(1,5)],'evidenceNote':'Four fictional M800 wards. Numeric ward keys toggle the mask; ENT accepts.'}
by['m-u1.6']['simulation']={'mode':'number','min':0,'max':7,'evidenceNote':'Manager guide p11 explicitly permits 0–7, from Sound Off to maximum.'}
for c,l in [(1,'Banner Text'),(2,'Group Names'),(3,'Telecommand Text')]:textfield('m-u1.7.'+str(c),'m-u1.7',l,12,c,'manager2010',selector='group' if c==2 else 'telecommand' if c==3 else None,scope='group' if c==2 else 'telecommand' if c==3 else None)
by['m-u1.9']['simulation']={'mode':'choice','choices':[{'id':'access-'+str(i),'label':l,'value':l} for i,l in enumerate(['Infinite','4 Hour Window','5 Min Window','Close Window'])],'evidenceNote':'Manager p14 names these four windows and permits hotkeys 1–4, but does not print the number-to-label mapping. Scroll by label; no uncertain numeric assignment is invented.'}
by['m-u1.0']['simulation']={'mode':'info','evidenceNote':'This returns to the context-sensitive setting/unsetting prompt. The matching 2010 Manager guide delegates the exact prompt variants to a separate User guide. FINDR does not invent numbered Set/Unset submenus.'}
for c,l,p in [(1,'View Zones',16),(2,'Time and Date',17),(3,'Edit Shunts',18),(4,'Edit Codes',20),(5,'Edit Chime Zones',31),(6,'Communications',32),(7,'Configure Wards',34),(8,'Edit Groups',35),(9,'Log',36),(0,'Timers',39)]:add('m-u2.'+str(c),'m-u2',l,p,c,source='manager2010')
by['m-u2.1']['simulation']={'mode':'zones','numericSelection':True,'networkKey':'change'}
clock('m-u2.2.1','m-u2.2','Set Time',17,1,'manager2010');clock('m-u2.2.2','m-u2.2','Set Date',17,2,'manager2010',date=True)
by['m-u2.3']['simulation']={'mode':'menu','selector':'shunt','scope':'shunt'}
flags('m-manager-shunt-zones','m-u2.3','Zones',18,[(str(i),'Zone '+str(i).zfill(4)) for i in range(1,5)],source='manager2010')
add('m-u2.4.1','m-u2.4','Code',24,1,source='manager2010',sim={'mode':'menu','selector':'user','scope':'user',**seq,'evidenceNote':'The common code-user sequence is reproduced with fictional users. Proximity enrolment and type-dependent skipping are not emulated.'})
textfield('m-manager-user-code','m-u2.4.1','Prox Tag or Code',24,source='manager2010',length=4,textMode='digits',minLength=4,evidenceNote='The fictional site uses four-digit codes; the source also supports six-digit sites. No tags or live credentials are enrolled.')
utypes=[('1','Manager'),('2','Standard Global'),('3','Standard Ward'),('4','Prox Tag User'),('5','Easy Set'),('6','Reset Only'),('7','Panic Code'),('8','Duress Code'),('9','Access'),(None,'Shunt'),(None,'Set Only'),(None,'Not in use')]
enum('m-manager-user-type','m-u2.4.1','User Type',21,utypes,source='manager2010')
by['m-manager-user-type']['sourceRefs']+=refs(22,'manager2010')+refs(23,'manager2010')
for i in range(4,9):by['m-manager-user-type-v'+str(i)]['sourceRefs']=refs(22 if i<8 else 23,'manager2010')
for i in range(9,12):by['m-manager-user-type-v'+str(i)]['sourceRefs']=refs(23,'manager2010')
flags('m-manager-user-wards','m-u2.4.1','User Wards',25,wardvalues,source='manager2010')
flags('m-manager-autoset','m-u2.4.1','Auto Set Wards',25,wardvalues,source='manager2010')
flags('m-manager-autounset','m-u2.4.1','Auto Unset Wards',25,wardvalues,source='manager2010')
info('m-manager-user-locks','m-u2.4.1','Code Locks',26,source='manager2010',reason='The final code-lock mask is documented, including ESC to finish. To avoid assigning unverified save semantics to this unusual final step, use the separate 2-0-4 Code Locks editor for training allocations.')
textfield('m-u2.4.2','m-u2.4','User Name',26,2,'manager2010',selector='user',scope='user')
add('m-u2.4.3','m-u2.4','Customise Menus',27,3,source='manager2010',sim={'mode':'menu','selector':'user','scope':'user',**seq})
for level in [1,2]:
 options=[n for n in nodes if n['parentId']=='m-u'+str(level)]
 flags('m-user-access-'+str(level),'m-u2.4.3','Menu '+str(level)+' Options',27 if level==1 else 28,[(n['code'],n['label']) for n in options],source='manager2010')
add('m-u2.4.4','m-u2.4','Telecommands',28,4,source='manager2010',sim={'selector':'telecommand','scope':'telecommand','evidenceNote':'The fictional inventory contains two demonstration controls. No radio pairing occurs.'})
enum('m-telecommand-type','m-u2.4.4','Telecmd Type',28,['Global','Local','Unused'],source='manager2010')
by['m-telecommand-type']['sourceRefs']+=refs(29,'manager2010')
for b in [1,2,3]:enum('m-telecommand-button-'+str(b),'m-u2.4.4','Button '+str(b)+' Set',29,[(str(i),'Group '+str(i)) for i in range(1,5)],source='manager2010')
flags('m-telecommand-unset','m-u2.4.4','Button 4 Unset',29,wardvalues,source='manager2010')
flags('m-telecommand-pa','m-u2.4.4','Button PA',30,wardvalues,source='manager2010')
textfield('m-telecommand-name','m-u2.4.4','Telecommand Name',30,source='manager2010',length=16)
by['m-u2.5']['simulation']={'mode':'choice','selector':'zone','scope':'zone','choices':[{'id':'chime-'+str(i),'code':str(i),'label':l,'value':l} for i,l in enumerate(['Disabled','Chime 1','Chime 2','Chime 3'])],'returnOnSave':True}
info('m-u2.6.1','m-u2.6','Start Call Back',32,1,'manager2010',reason='This chooses one of four callback numbers and begins a modem link on hardware. FINDR has no modem or remote transport.')
textfield('m-u2.6.2','m-u2.6','Edit Call Back',33,2,'manager2010',length=32,textMode='telephone',selector='phone',scope='phone',evidenceNote='Four fictional callback records. The helper uses a 32-character training bound; physical comma insertion is not reproduced.')
by['m-u2.7']['simulation']={'mode':'menu','selector':'zone','scope':'zone'}
flags('m-manager-zone-wards','m-u2.7','Wards',34,wardvalues,source='manager2010')
by['m-u2.8']['simulation']={'mode':'menu','selector':'group','scope':'group'}
flags('m-manager-group-wards','m-u2.8','Wards',35,wardvalues,source='manager2010')
for c,l,p in [(1,'View Log',36),(2,'Print Log',37),(3,'View Access Log',38),(4,'Print Access Log',38)]:add('m-u2.9.'+str(c),'m-u2.9',l,p,c,'status' if c in [1,3] else 'command','manager2010',sim={'mode':'log','detailsKey':'change','reverseLogScroll':True} if c in [1,3] else {'mode':'action','action':'print','evidenceNote':'Local fictional report; printer prompts are simplified.'})
for c,l,p,s in [(1,'Exceptions',40,'exception'),(2,'Auto-Sets',42,'autoSetLater'),(3,'Time Switches',46,'timeSwitchLater'),(4,'Code Locks',49,'codeLockLater')]:add('m-u2.0.'+str(c),'m-u2.0',l,p,c,source='manager2010',sim={'selector':s,'scope':s})
textfield('m-ex-description','m-u2.0.1','Description',41,source='manager2010')
for s,l in [('start','Start'),('end','End')]:
 clock('m-ex-'+s+'-time','m-u2.0.1',l+' Time',41,None,'manager2010')
 textfield('m-ex-'+s+'-date','m-u2.0.1',l+' Date',41,source='manager2010',length=4,textMode='digits',format='date-month')
for parent,p in [('m-u2.0.2',43),('m-u2.0.3',46),('m-u2.0.4',49)]:
 if parent.endswith('.3'):enum(parent+'-status',parent,'Status',47,['Off','On'],1,'manager2010')
 textfield(parent+'-description',parent,'Description',p,2 if parent.endswith('.3') else 1,'manager2010')
 count=3 if parent.endswith('.3') else 1
 for j in range(1,count+1):
  seqid=parent+'-period'+str(j)
  add(seqid,parent,('On/Off Time '+str(j)) if count>1 else 'On/Off times',p,2+j if count>1 else 2,source='manager2010',sim={'mode':'menu',**{**seq,'sequenceEnd':'parent'}})
  clock(seqid+'-on',seqid,'On Time',p+1,None,'manager2010')
  flags(seqid+'-on-days',seqid,'On Days',p+1,[(str(i+1),l) for i,l in enumerate(['Sun','Mon','Tue','Wed','Thu','Fri','Sat'])],source='manager2010')
  clock(seqid+'-off',seqid,'Off Time',p+1,None,'manager2010')
  flags(seqid+'-off-days',seqid,'Off Days',p+1,[(str(i+1),l) for i,l in enumerate(['Sun','Mon','Tue','Wed','Thu','Fri','Sat'])],source='manager2010')
  if parent.endswith('.2'):flags(seqid+'-wards',seqid,'Wards',44,wardvalues,source='manager2010')
 add(parent+'-exceptions',parent,'Exceptions',45 if parent.endswith('.2') else 48 if parent.endswith('.3') else 50,6 if parent.endswith('.3') else 3,'setting','manager2010',sim={'mode':'flags','choices':[{'id':'exception-'+str(i),'label':'Exception '+str(i).zfill(2),'value':'exception-'+str(i)} for i in range(1,31)],'toggleKeys':['change'],'evidenceNote':'FINDR consolidates exception allocations into one editable mask per timer. The panel selects each programmed exception, toggles No/Yes and accepts it separately. Calendar execution is not simulated.'})
 if parent.endswith('.4'):add(parent+'-users',parent,'Users',51,4,'setting','manager2010',sim={'mode':'flags','choices':[{'id':'user-'+str(i),'label':'User '+str(i).zfill(3),'value':'user-'+str(i)} for i in range(1,5)],'toggleKeys':['change'],'evidenceNote':'Four fictional users are offered. FINDR stores the allocation mask; the panel toggles each user Yes/No and ENT advances to the next user.'})
# Evidence boundaries reflect the actual discrepancies in these two editions.
gap('menvier-edition-match','Engineer and Manager editions differ','Which exact M750/M800 firmware revision is installed, and can you provide its matching Manager manual?',['m-engineer','m-manager'],'The pinned engineer guide is 2006; the public M800 Manager guide is 2010. Their timer menus differ and are kept in separate contexts.')
gap('menvier-timer-bounds','Timer and counter accepted ranges','What minimum and maximum does the matching keypad accept for each timer?',['m-e1.5.1','m-e1.5.2','m-e1.8.3'],'The manual illustrates three-digit fields but does not state all accepted ranges. FINDR labels the 000–999 training input instead of claiming hardware range validation.')
gap('menvier-output-scope','Output record and conditional flow','Can you capture Panel Outputs through System/Ward/Zone source selection, inversion and pulse duration?',['m-e1.4'],'All function value labels are sourced; conditional field order, hardware bank population and gate logic require further keypad verification.')
gap('menvier-custom-text','Text-field lengths','Can you verify lengths for Reset Message, Location Text, Banner and auxiliary tamper names?',['m-e1.7'],'The source explicitly gives 16-character zone descriptions; other custom text editors use a 16-character training limit pending physical verification.')
gap('menvier-manual-conflicts','Printed table discrepancies','Can you confirm Time Switch capacity and the AC Bypass choices on the matching firmware?',['m-e1.5.3','m-e1.9.3.11'],'The old guide’s time-switch prose says three while a diagram shows hotkeys 1–4. AC Bypass heading and prose differ; the prose values Always/Healthy/Never are retained.')
gap('menvier-advanced-hardware','Special operations and attached devices','Can you provide flows for custom gates, false setting, radio devices and network error reset?',['m-e1.4.6','m-e2.7.3.2','m-e2.7.3.6','m-u1.1.4'],'These branches remain explicitly limited rather than inventing results from disconnected hardware.')
gap('menvier-input-limits','Older volume and communications field bounds','Can you confirm the older M800 volume range and permitted telephone/account lengths?',['m-e2.3','m-e2.5.1.4','m-e2.5.2.2','m-e2.5.2.3'],'The later Manager guide verifies volume 0–7; the older engineer guide does not state the numeric maximum. Phone and account field lengths remain labelled training bounds.')
gap('menvier-manager-flows','Manager setting and test prompt variants','Can you provide the matching 2010 M800 User guide and captures of Bell Test, walk-test result review and exception allocation?',['m-u1.0','m-u1.1.1','m-u1.1.2','m-u2.0'],'The physical bell/strobe sequence, context-sensitive set/unset prompt and per-record calendar allocation are not represented as exact firmware sequences.')
# Keep direct references to the bounded, source-backed lessons.
for id,tasks in {
 'm-u1.2':['omit-zone','restore-zone'],
 'm-e2.7.3.4':['check-resistance'],
 'm-e2.1':['view-zone-status'],
 'm-e2.8.1':['find-last-alarm'],
 'm-u1.1.2':['walk-test-pir'],
 'm-engineer':['leave-engineering'],
}.items():by[id]['practiceTaskIds']=tasks
for id in ['m-e2.1','m-e2.7.3.4','m-u2.1']:
 by[id]['simulation']['detailsKey']='none'
 by[id]['simulation']['evidenceNote']='Four fictional panel zones are available. Toggle-to-next-network has no target in this fixture; # does not reveal an extra resistance screen.'
for id in ['m-e2.8.1','m-e2.8.3','m-u2.9.1','m-u2.9.3']:
 by[id]['simulation']['evidenceNote']='Up selects earlier events; Toggle shows associated text. Numeric event filters and the physical offset shortcut are not implemented in the fictional log.'
# Full value catalogues span several narrative pages. Cite the actual compact
# manufacturer tables, rather than incorrectly attaching every value to the
# first page of its prose chapter.
for n in nodes:
 if n['parentId'] in ['m-zone-type','m-zone-attributes']:n['sourceRefs']=refs(126)
 if n['parentId']=='m-output-ward-event':n['sourceRefs']=refs(126)+refs(127)
 if n['id'].startswith('m-system-timer-') or n['id'].startswith('m-e1.9.'):
  n['sourceRefs']+=refs(127)
 if n['parentId'] in ['m-downloader-rings','m-downloader-baud','m-downloader-answer','m-e2.5.2.1']:
  n['sourceRefs']+=refs(128)
by['m-custom-text-7']['sourceRefs']=refs(127)
for id in ['m-telecommand-type-v1','m-telecommand-type-v2']:by[id]['sourceRefs']=refs(29,'manager2010')
# Attach field defaults only as fictional fixtures, never factory defaults.
for n in nodes:
 s=n.get('simulation',{})
 if s.get('mode')=='choice':
  vals=[v for v in nodes if v['parentId']==n['id'] and v['kind']=='selection']
  if vals and 'defaultValue' not in s:s['defaultValue']=vals[0]['label']
 if s.get('mode')=='number' and 'defaultValue' not in s:s['defaultValue']=max(s.get('min',0),min(15,s.get('max',999)))
 if s.get('mode')=='flags' and 'defaultValue' not in s:s['defaultValue']={}
 if s.get('mode')=='text' and 'defaultValue' not in s:s['defaultValue']='1200' if s.get('format')=='time' else '291026' if s.get('format')=='date-short' else '2512' if s.get('format')=='date-month' else ''
# Optional fields marked None must not trigger selectors.
for n in nodes:
 if 'simulation' in n:n['simulation']={k:v for k,v in n['simulation'].items() if v is not None}
mapdata=dict(schemaVersion=1,profileId='menvier-mseries',title='Menvier M750 / M800 menu map',panelModels=['M750','M800'],keypadModels=['MKP3-style classic M Series LCD'],baseline='Engineer: 496966 Issue 5 (2006), M750/M800 subset. Manager: separate later M800/M2000 manual 11821957 (2010). Firmware versions are not asserted as interchangeable.',scope='Broad documented Engineer levels 1–2 and later Manager levels 1–2, with factual value catalogues and explicit interactive limits. Does not represent Menvier30/40/100/300 or TS700/TS900.',verifiedAt='2026-10-29',sources=sources,numbering=dict(style='numbered',explanation='Addresses such as 2.7.3.4 mean a local hotkey at each menu level, each followed by ENT. They are not a single four-digit root shortcut. The four-digit zone address identifies a network/device/input.',examples=[dict(code='2.7.3.4',meaning='Engineer Menu 2 → Built In Tests → Equipment → Zone Resistance'),dict(code='0002',meaning='Panel zone 2, not a menu address'),dict(code='1.2',meaning='In Engineer context: Zones Advanced. In User context: Omit Zones.')],caveats=['Unnumbered values require scrolling.','Later Manager calendar timers are separate from older Engineer timer menus.','Order is not a numeric key unless code is explicitly present.']),navigation=[dict(keys='↑ / ↓, numeric hotkey, ENT',action='Scroll or choose a local option number, then ENT enters.',sourceRefs=refs(22)),dict(keys='ESC',action='Back one step; confirm at the leave-menus prompt to persist engineer changes.',sourceRefs=refs(21)+refs(22)),dict(keys='Toggle',action='Contextual attribute/omit change or log details. It is a physical key separate from #.',sourceRefs=refs(24)+refs(7,'manager2010')+refs(36,'manager2010'))],nodes=nodes,gaps=gaps,coverage=dict(strategy='Reviewed complete engineer quick reference against body diagrams and separate Manager menu chapters; individual fields retain exact page references.',mappedAreas=['Engineer menus 1 and 2','Zone type, attribute, ward and description sequence','Zone resistance configuration and diagnostics','Ward and group settings','Output families and source function catalogues','System and ward timers','General, DD243 and EN50131 options','Downloader and communicator menu structure','Power supply, input, fuse and network diagnostics','Manager tests, omission, users, logs and calendar timers'],excludedAreas=['Menvier30/40/100/300','TS-series menus','Real radio enrolment, modem/network transport or NVM defaulting','Exact attached-hardware population and full firmware timing'],hardwareVerified=False,confidence='Manufacturer-manual baseline with disclosed source splits and simplified fixtures, not complete firmware emulation.'))
(ROOT/'public/app/data/menu-maps/menvier-mseries.json').write_text(json.dumps(mapdata,indent=2,ensure_ascii=False)+'\n')
print('Menvier atlas:',len(nodes),'nodes;',len(gaps),'explicit evidence gaps')
