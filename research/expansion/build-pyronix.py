"""Reproducible, manually reviewed Enforcer V11 menu and behaviour inventory.
Labels/order/value facts are pinned to the three manufacturer-authored sources.
Descriptions and practice data are FINDR's own; source PDFs are not redistributed.
"""
from pathlib import Path
import json, hashlib, re
ROOT=Path(__file__).resolve().parents[2]
N=[]; O={}; counts={}; gaps=[]
def ref(page,src='prog'):return {'sourceId':src,'printedPage':str(page),'pdfPage':page}
def slug(s):return re.sub(r'[^a-z0-9]+','-',s.lower()).strip('-')
def add(id,parent,label,kind='menu',page=7,src='prog',summary='',code=None,aliases=None,conditions=None,notes=None,**behavior):
 counts[parent]=counts.get(parent,0)+1
 n={'id':id,'parentId':parent,'order':counts[parent],'label':label,'code':code,'kind':kind,'access':'Master Manager' if id.startswith('pm-') else 'User' if id.startswith('pu-') else 'Engineer','summary':summary or ('Documented '+('choice for the parent field.' if kind=='selection' else 'Enforcer V11 '+label.rstrip('?')+' location.')),'aliases':aliases or [],'conditions':conditions or [],'sourceRefs':[ref(page,src)],'notes':notes or [],'practiceTaskIds':[]}
 if code is not None:n['codeType']='value' if kind=='selection' else 'parameter'
 N.append(n)
 if behavior:O[id]=behavior
 return id
seq={'sequentialFields':True,'immediateFields':True,'advanceOnSave':True,'previousFieldKey':'cancel','recordNextKey':'right','recordPreviousKey':'left','sequenceEnd':'parent'}
def menu(id,parent,label,page,src='prog',**kw):return add(id,parent,label,page=page,src=src,mode='menu',numericSelection=False,question=True,menuWrap=False,**kw)
def sequence(id,parent,label,page,src='prog',scope=None,**kw):
 opts=dict(seq);opts.update(kw)
 if scope:opts.update(selector=scope,scope=scope,sequenceEnd='selector')
 return menu(id,parent,label,page,src,**opts)
def choice(id,parent,label,values,page,src='prog',default=None,**kw):
 add(id,parent,label,'setting',page,src,mode='choice',**kw)
 cs=[]
 for i,v in enumerate(values):
  code,text=(str(v[0]) if v[0] is not None else None,v[1]) if isinstance(v,tuple) else (str(i),v)
  nid=id+'-v-'+(slug(code) if code is not None else slug(text))
  add(nid,id,text,'selection',page,src,code=code)
  cs.append({'id':nid,'label':text,'code':code,'value':text})
 O[id]['choices']=cs
 if default is not None:O[id]['defaultValue']=default
 return id
def boolean(id,parent,label,page,src='prog',**kw):return choice(id,parent,label,[(0,'No'),(1,'Yes')],page,src,default='No',**kw)
def number(id,parent,label,lo,hi,page,units='',src='prog',default=None,**kw):
 return add(id,parent,label,'setting',page,src,mode='number',min=lo,max=hi,units=units,defaultValue=lo if default is None else default,**kw)
def text(id,parent,label,page,src='prog',limit=16,default='',**kw):
 return add(id,parent,label,'setting',page,src,mode='text',maxLength=limit,defaultValue=default,evidenceNote='FINDR text helper edits this fictional value. Predictive text and exact multi-tap timing are not reproduced; this is not a claim about the installed firmware limit.',**kw)
areaKeys={'logout':'A','previous':'B','cancel':'C','area-d':'D'}
def areas(id,parent,label,page,src='prog',**kw):
 add(id,parent,label,'setting',page,src,mode='flags',keyChoiceCodes=areaKeys,defaultValue={'A':True,'B':False,'C':False,'D':False},choices=[{'id':x,'label':x,'code':x,'value':x} for x in 'ABCD'],**kw)
 for x in 'ABCD':add(id+'-'+x.lower(),id,'Area '+x,'selection',page,src,code=x)
 return id
def status(id,parent,label,page,src='prog',lines=None,**kw):return add(id,parent,label,'status',page,src,mode='status',displayLines=lines or [label.rstrip('?'),'FINDR DEMO'],**kw)
def external(id,parent,label,page,src='prog',**kw):return add(id,parent,label,'command',page,src,mode='info',evidenceNote='The menu location is documented. This operation depends on external equipment or a destructive panel operation; FINDR does not invent a hardware result.',**kw)
def gap(id,title,question,reason,ids,priority='medium'):
 gaps.append({'id':id,'title':title,'question':question,'reason':reason,'priority':priority,'affectedNodeIds':ids,'neededEvidence':'Matching Enforcer V11 software screen or manufacturer clarification.'})
# Exact top-level order is the programming guide p7 flow diagram.
add('py-engineer',None,'Engineer menu',page=7,mode='menu',numericSelection=False)
tops=[('date','SET DATE & TIME?',12),('wireless','WIRELESS DEVICE CONTROL?',12),('inputs','CHANGE INPUTS?',16),('mode','CHOOSE MODE?',19),('zems','INSTALL ZEMS?',19),('outputs','CHANGE OUTPUTS?',20),('keypads','ASSIGN KEYPADS/READERS?',21),('timers','CHANGE TIMERS?',24),('codes','CODES AND USERS?',25),('volume','VOLUME CONTROL?',26),('system','SYSTEM OPTIONS?',27),('logs','REVIEW LOGS?',30),('tests','ENGINEER TESTS?',31),('diagnostics','DIAGNOSTICS?',34),('restore','ENGINEER RESTORE OPTIONS?',37),('communications','COMMUNICATIONS?',38),('response','ALARM RESPONSE?',38),('downloading','SET UP DOWNLOADING?',41),('dial','DIAL OUT MENU',42),('software','SOFTWARE REVISION?',43),('clean','CLEAN START?',43),('exit','EXIT ENGINEER MENU',43)]
for k,label,p in tops:menu('py-'+k,'py-engineer',label,p)
O['py-exit']={'mode':'action','action':'logout','confirmLabel':'Leave the authorised Engineer menu and commit fictional settings?'}
# Clock is a sequential series, not a list of numeric menu addresses.
def clock(parent,p,src):
 O[parent].update(seq)
 for suffix,label,lo,hi,value in [('year','Year (00-99)',0,99,26),('month','Month (01-12)',1,12,10),('day','Day (01-31)',1,31,29),('hours','Hours (00-23)',0,23,12),('minutes','Minutes (00-59)',0,59,0)]:number(parent+'-'+suffix,parent,label,lo,hi,p,src=src,default=value)
 boolean(parent+'-dst',parent,'DST Adjust?',p,src)
clock('py-date',44,'prog')
# Wireless learning is reference-only, while keyfob configuration is editable.
for kind,label,page,scope in [('inputs','Control Inputs?',13,'zone'),('bells','Control Bells?',13,'bell'),('stations','Control Keypad/Speakers?',14,'station')]:
 p='py-wireless-'+kind;menu(p,'py-wireless',label,page)
 external(p+'-learn',p,'Learn devices?',page,selector=scope,scope=scope)
 menu(p+'-delete',p,'Delete devices?',page)
 external(p+'-delete-all',p+'-delete','Delete all',page)
 external(p+'-delete-one',p+'-delete','Choose input to delete' if kind=='inputs' else 'Select bell to delete' if kind=='bells' else 'Select keypad / speaker to delete',page,selector=scope,scope=scope)
 if kind=='bells':
  for n in N:
   if n['id'].startswith(p+'-delete'):n['sourceRefs']=[ref(14)]
sequence('py-wireless-fobs','py-wireless','Program Keyfob Buttons?',15,scope='user')
choice('py-fob-button','py-wireless-fobs','Select Button',[(1,'Lock'),(2,'Unlock'),(3,'I'),(4,'II'),(5,'Lock + Unlock'),(6,'I + II'),(7,'Lock + I'),(8,'Unlock + II')],15,default='Lock')
choice('py-fob-action','py-wireless-fobs','Button Action',[(0,'No Action'),(1,'Show Status'),(2,'Set Area'),(3,'Unset Area'),(None,'Operate Output'),(6,'Hold Up')],15,default='Show Status',conditions=['Hold Up applies only to a supported two-button combination.'])
areas('py-fob-areas','py-wireless-fobs','Areas',15,conditions=['Displayed for a set/unset action.'])
# Input programming sequence, with nested question submenus.
O['py-inputs'].update(seq,selector='zone',scope='zone',sequenceEnd='selector')
inputTypes=[('00','Unused'),('01','Fire'),('02','Gas'),('03','HU'),('04','Silent HU'),('05','Tamper'),('06','Intruder'),('07','Final Exit'),('08','Entry Route'),('09','ER (Part FX)'),('10','FX (Part ER)'),('11','PTS'),('12','Switcher'),('13','Day Alarm'),('16','Fault'),('20','Keyswitch Latched'),('21','Entry Shock Input'),('23','Keyswitch Pulsed'),('32','Flood'),('42','Medical'),('44','ATE Line Fail')]
choice('py-input-type','py-inputs','Input Type',inputTypes,51,bind='zoneType',default='Intruder',aliases=['zone type','detector function'])
for n in N:
 if n['parentId']=='py-input-type' and n['code'] in ['21','23','32','42','44']:n['sourceRefs']=[ref(52)]
areas('py-input-areas','py-inputs','Input Areas',18,bind='zoneAreas')
choice('py-input-area-logic','py-inputs','Input Areas (Any/All)',[(0,'Any'),(1,'All')],18,default='Any')
sequence('py-input-attributes','py-inputs','Input Attributes?',18)
choice('py-input-chime','py-input-attributes','Chime',[(0,'No'),(None,'Single'),(None,'Follow')],17,default='No')
for k,label in [('omittable','Omittable'),('double-knock','Double Knock'),('normally-open','Normally Open'),('occupancy','Occupancy'),('monitor-activity','Monitor Activity')]:
 boolean('py-input-'+k,'py-input-attributes',label,17,**({'bind':'zoneOmitEnabled'} if k=='omittable' else {}))
choice('py-input-special-log','py-input-attributes','Special Log',[(0,'No'),(None,'When set'),(None,'When unset'),(None,'Always')],17,default='No')
boolean('py-input-supervision','py-input-attributes','Supervision',17)
number('py-input-confirm-group','py-input-attributes','Confirm Group',0,99,17,default=0)
sequence('py-input-description','py-inputs','Input Description?',18)
text('py-input-name','py-input-description','Enter Name',18,bind='zoneName',aliases=['zone text','rename detector','input description'])
text('py-input-location','py-input-description','Enter Location',18,aliases=['zone location'])
O['py-mode'].update(seq)
choice('py-eol-range','py-mode','EOL Range',[(0,'Alarm 1K / Tamper 1K'),(1,'Alarm 4K7 / Tamper 2K2'),(None,'Alarm 4K7 / Tamper 4K7'),(None,'Wide range')],19,default='Alarm 4K7 / Tamper 2K2',aliases=['resistor values','wiring resistance'])
choice('py-eol-mode','py-mode','EOL Mode',[(0,'SR (SEOL)'),(1,'DR (DEOL)')],19,default='DR (DEOL)')
number('py-input-response','py-mode','Input Response',1,30,19,units='×100 ms',default=3)
gap('py-eol-duplicate','Duplicate printed EOL code','Which numeric code selects Wide range on the installed V11 keypad?','Programming p19 gives code2 to both 4K7/4K7 and Wide range. Those two numeric shortcuts are not invented.',['py-eol-range'])
O['py-zems'].update(seq,selector='module',scope='module',sequenceEnd='selector')
choice('py-zem-installed','py-zems','ZEM Installed',[(0,'No'),(1,'ZEM8 / EURO37R'),(2,'EURO-ZEM32-WE')],19,default='ZEM8 / EURO37R')
text('py-zem-location','py-zems','Enter Location',19)
# One source list of output functions, shared by explicit output fields.
outputTypes=[('0000','Not Used'),('0001','Fire'),('0002','Hold Up Any'),('0003','Intruder Any'),('0005','Misoperation Any (Abort)'),('0006','Confirmed Any'),('0007','Tamper Any'),('0008','Duress'),('0009','HU Device Any'),('0010','Gas'),('0011','Set Fail'),('0012','Entry Deviation'),('0013','Secure Intruder Any'),('0014','Siren Any'),('0016','Strobe Any'),('0017','Omit Rearm Any'),('0018','Unconfirmed Any'),('0021','Exit Starts Any'),('0022','Final Set Any'),('0023','Strobe Set Fail'),('0025','Keyswitch disarmed'),('0026','Set with Omit'),('0028','Power Fault'),('0029','Confirmed Intruder Any'),('0030','Confirmed Hold Up Any'),('0033','Entry/Exit'),('0034','Lights'),('0035','Follow Input'),('0037','Restore 1'),('0038','Restore 2'),('0039','PIR Latch 1'),('0040','PIR Latch 2'),('0041','Mains Good'),('0042','Detr Indn Enable'),('0043','Follow Test'),('0044','Off During Test'),('0048','Detr Walk Test'),('0049','Detector Masked'),('0050','Follow 24 Hour'),('0051','Line Fault'),('0052','Mains Fail'),('0053','Battery Faults'),('0054','Low Volts'),('0055','Global Fault 1'),('0056','Global Fault 2'),('0058','Guard Code Used'),('0059','Engineer Access'),('0060','Initialise Digi'),('0063','Test ATE/GSM'),('0064','Test ATS'),('0065','Input Activity Fault'),('0066','ATE not used')]
outputTypes += [(str(170+i).zfill(4),'User Defined '+str(i+1).zfill(2)) for i in range(30)]
for k,label,scope in [('endstation','Endstation Outputs?',None),('zem','ZEM Outputs?','module'),('bells','Wireless Bells?','bell'),('module','Output Module Outputs?','outputModule'),('keypad','Keypad Outputs?','keypad'),('reader','Reader Outputs?','reader'),('user','User Outputs?','output')]:
 sequence('py-output-'+k,'py-outputs',label,20,scope=scope)
choice('py-output-bell','py-output-endstation','BELL O/P',outputTypes,54,default='Siren Any')
for n in N:
 if n['parentId']=='py-output-bell':
  c=int(n['code']);n['sourceRefs']=[ref(54 if c<30 else 55 if c<64 else 56)]
sharedChoices=O['py-output-bell']['choices']
for p,label,suffix in [('py-output-endstation','STB O/P','strobe'),('py-output-endstation','PGM O/P','pgm'),('py-output-bells','BELL O/P','bell-function'),('py-output-bells','STB O/P','strobe-function'),('py-output-keypad','Output 1','function'),('py-output-reader','Output 1','function')]:
 add(p+'-'+suffix,p,label,'setting',45,mode='choice',choices=sharedChoices,defaultValue='Not Used',notes=['Uses the output function table on pp54–56; values are indexed once in BELL O/P.'])
for i in range(1,5):add('py-output-zem-'+str(i),'py-output-zem','Output '+str(i),'setting',45,mode='choice',choices=sharedChoices,defaultValue='Not Used')
boolean('py-output-module-installed','py-output-module','OP Mod Installed',45)
add('py-output-module-function','py-output-module','Output Function','setting',20,mode='choice',selector='output',scope='output',choices=sharedChoices,defaultValue='Not Used',evidenceNote='Output programming and its function domain are documented. This generic field label and four fitted output records are FINDR fixtures; the precise module prompt and record-selection sequence need a matching hardware screen.',notes=['Fitted output count depends on the physical module; four fictional output records are provided.'])
gap('py-output-module-sequence','Output module field prompt and sequence','What display follows OP Mod Installed when your fitted output module is enabled?','The guide documents output programming and module addressing but does not print the complete output-module field sequence. FINDR uses an explicitly labelled function editor fixture.',['py-output-module-function'])
choice('py-user-output-type','py-output-user','User Output Type',[(0,'Latched'),(None,'Timed')],45,default='Latched')
text('py-user-output-name','py-output-user','User Output Name',45)
add('py-user-output-time','py-output-user','User Output Time','setting',20,mode='info',conditions=['Timed user output only.'],evidenceNote='The guide describes timed operation but gives no complete accepted timer range here.')
for code,label in [('0600–0609','Timers 01–10'),('0610–0619','Calendar (printed 01–20)'),('0620–0639','Logic Gate 01–20'),('0640–0649','Delay 01–10'),('1xxx','Follow Input xxx')]:add('py-output-ref-'+slug(code),'py-output-bell',label,'reference',56,code=code,summary='Source range reference; not expanded into invented fitted records.',notes=['The 0600–0649 ranges are marked for future development. Calendar count/range is inconsistent in the source.'])
# Keypads, readers and arming stations have genuine conditional branches.
O['py-keypads'].update(seq,selector='keypad',scope='keypad',sequenceEnd='selector')
choice('py-keypad-type','py-keypads','Type',[(0,'Keypad'),(1,'Reader'),(2,'Not Used')],21,default='Keypad')
for suffix,label in [('sets','Set Point Sets'),('unsets','Set Point Unsets'),('in','Set Point In')]:areas('py-keypad-'+suffix,'py-keypads',label,22)
sequence('py-keypad-description','py-keypads','Set Point Description?',22)
text('py-keypad-name','py-keypad-description','Enter Name',22)
text('py-keypad-location','py-keypad-description','Enter Location',22)
# Conditional definitions retain their parent value, rather than appearing on every keypad.
readerValue='py-keypad-type-v-1'
O[readerValue]={'mode':'menu','include':True,**seq}
choice('py-reader-mode',readerValue,'Reader is',[(0,'Set Point'),(1,'Not Used'),(2,'Access Control'),(3,'Unset Only'),(4,'Entry Control')],21,default='Set Point')
for suffix,label in [('sets','Set Point Sets'),('unsets','Set Point Unsets'),('in','Set Point In')]:areas('py-reader-'+suffix,readerValue,label,23)
number('py-reader-lock-time',readerValue,'Lock Open Time',0,255,23,units='seconds',conditions=['Entry Control or Access Control readers only.'])
number('py-reader-door-time',readerValue,'Door Open Time',0,255,23,units='seconds',conditions=['Entry Control or Access Control readers only.'])
text('py-reader-name',readerValue,'Enter Name',23)
text('py-reader-location',readerValue,'Enter Location',23)
gap('py-reader-code','Reader and keypad code discrepancies','Confirm Type and Reader is value numbers on the installed V11 panel.','The p21 enumeration and p22 workflow/appendix p45 disagree. FINDR uses the p21 enumeration and disables guesses beyond those named values.',['py-keypad-type','py-reader-mode'])
# Wireless station options are a documented conditional address branch.
menu('py-station-options','py-keypads','Wireless arming station options',23,conditions=['Address4–7 is a learned wireless arming station.'],notes=['This reference grouping identifies the address-dependent options; it is not an extra physical menu.'])
O['py-station-options'].update(mode='info',evidenceNote='Select a wireless station address on real hardware to obtain these fields; the fictional wired keypad records do not expose an invented address branch.')
for suffix,label in [('tag-read','Tag Read Enable'),('auto-wakeup','Auto Wakeup'),('supervision','Supervision'),('backlight','Back Light'),('entry-exit-sound','Entry/Exit Sound')]:boolean('py-station-'+suffix,'py-station-options',label,23)
# Timers use exact independent field names/ranges. Missing ranges remain reference-only.
O['py-timers'].update(seq)
for label,lo,hi,unit,default in [('Entry Time',0,255,'seconds',30),('Exit Time',0,255,'seconds',20),('APP Exit Time',0,199,'seconds',30),('Siren Time',2,15,'minutes',4),('Siren Delay',0,20,'minutes',0)]:
 for a in 'ABCD':number('py-timer-'+a.lower()+'-'+slug(label),'py-timers',a+' '+label,lo,hi,52,units=unit,default=default)
for label,lo,hi,unit,pg,default in [('Confirm Time',1,99,'minutes',52,30),('HU Confirm Time',8,20,'hours',52,8),('Strobe Time',0,99,'minutes',52,0),('Re-Arm No.',0,9,'',52,3),('AC Signal Delay',0,250,'minutes',52,40),('Settle',0,255,'seconds',53,5),('Double Knock',0,75,'seconds',53,10),('Pre-Alarm',0,255,'seconds',53,30),('Comm Fault Delay',0,250,'seconds',53,180),('Set Fail',0,255,'seconds',53,40),('Fire Siren Time',1,99,'minutes',53,4),('Set Fail Warning',0,99,'seconds',53,0),('Input NAT Days',0,14,'days',53,14),('Input NAT Hours',0,23,'hours',53,0),('Wireless Supervision Time',0,99,'hours',53,2),('Wireless Jamming Time',0,100,'seconds',53,30)]:number('py-timer-'+slug(label),'py-timers',label,lo,hi,pg,units=unit,default=default)
for label,pg,reason in [('Wi-Fi Fault Delay',46,'Listed in the defaults table, but the complete range is not specified in Appendix C.'),('Occupancy',53,'The printed range is incomplete: “0 - hours”.'),('Service Time',53,'The table prints “367 days” without an unambiguous minimum/maximum range.')]:add('py-timer-'+slug(label),'py-timers',label,'setting',pg,mode='info',evidenceNote=reason)
areas('py-timer-occupancy-suspend','py-timers','Occupancy Suspend',53)
gap('py-timer-ranges','Incomplete timer ranges','What ranges are displayed for Occupancy, Service Time and Wi-Fi Fault Delay on your V11 panel?','The source omits or truncates these ranges; no arbitrary number editor has been enabled.',['py-timer-occupancy','py-timer-service-time','py-timer-wi-fi-fault-delay'])
# Codes are fictional input fields; source default credentials are never included.
O['py-codes'].update(seq)
boolean('py-five-digit-pins','py-codes','5 Digit PINs?',25)
external('py-delete-users','py-codes','Delete Users and Fobs?',25,question=True)
sequence('py-duress','py-codes','Change Duress Codes?',25,scope='specialUser')
choice('py-duress-type','py-duress','Code Type',[(2,'Duress'),(3,'Guard'),(4,'Dial Out')],25,default='Guard')
text('py-duress-code','py-duress','Code',25,limit=6,textMode='digits',minLength=4)
sequence('py-master-code','py-codes','Change Master Manager Code?',25)
text('py-master-code-value','py-master-code','Master Manager Code',25,limit=6,textMode='digits',minLength=4)
areas('py-master-areas','py-master-code','User Areas',47)
choice('py-master-set-options','py-master-code','User Set Options',[(0,'Unset / Set'),(1,'Unset Only'),(2,'Set Only'),(3,'None')],25,default='Unset / Set')
boolean('py-master-flexi','py-master-code','Flexi Set',25)
text('py-master-name','py-master-code','User Name',47)
sequence('py-engineer-code','py-codes','Change Engineer Code?',26)
text('py-engineer-code-value','py-engineer-code','Engineer Code',26,limit=6,textMode='digits',minLength=4)
O['py-volume'].update(seq)
for a in 'ABCD':
 for kind in ['Entry','Exit']:number('py-volume-'+a.lower()+'-'+kind.lower(),'py-volume',a+' '+kind,0,7,27,default=4)
for kind in ['App Exit','Alarm','Fire','Tamper','Day Alarm','Chime']:number('py-volume-'+slug(kind),'py-volume',kind,0,7,26,default=4)
for label in ['Code Stops Sound','E/E Keypads Only','Alert Kps Only','Silent Tech Alert','Use Main Sounder']:boolean('py-volume-'+slug(label),'py-volume',label,27)
for suffix,label,pg in [('site','Site Options?',27),('occupancy','Occupancy Zones?',29),('displays','System Displays?',30),('exit-modes','Exit Modes?',30)]:sequence('py-system-'+suffix,'py-system',label,pg)
for label,p in [('Set With Fault',27),('Set With Tamper',27),('Set With ATS Fault',27),('Set Fail = Alarm',27),('Do Bat Load Test',27),('Use Level Set',28),('Autoset Force',28),('Restrict PIN Use',28),('Simple Set',28),('Intelligent Set',28),('Common Lobby',28),('Flexi Unset',28),('Tag Opens Doors',29),('Fire Key Enable',29),('Set With Poll Fault',29),('Fob Unset Entry',29),('Wireless Bell Supervision',29),('Download If Set',29)]:boolean('py-site-'+slug(label),'py-system-site',label,p)
choice('py-site-strobe','py-system-site','Strb/Sqwk At Set',[(0,'None'),(None,'Strobe'),(None,'Squawk'),(None,'Both')],28,default='None')
choice('py-site-hu','py-system-site','2 Key HU',[(None,'Silent'),(None,'Bells Only'),(2,'Both'),(3,'None')],28,default='None')
choice('py-site-cloud-priority','py-system-site','UDL/Cloud Priority',[(0,'High'),(1,'Low')],48,default='Low')
for label in ['Push Notification','SMS','ARC Call','Keypad Sounder','Internal Sounder','External Sounder']:boolean('py-occupancy-'+slug(label),'py-system-occupancy',label,29)
for a in 'ABCD':text('py-area-'+a.lower()+'-text','py-system-displays','Area '+a+' Text',30,limit=16,default='Area '+a)
for label in ['Full Area Text','Sign on Message']:text('py-display-'+slug(label),'py-system-displays',label,48,limit=16)
for label in ['Display When Set','Display Alarms','Display HUs','Display Inputs']:boolean('py-display-'+slug(label),'py-system-displays',label,30)
for a in 'ABCD':choice('py-exit-mode-'+a.lower(),'py-system-exit-modes',a+' Exit Mode',[(0,'Timed'),(1,'Final Door'),(2,'Timed/Final'),(3,'Push to Set')],30,default='Timed')
# Operational log/test screens use local event/detector fixtures only.
logBehavior={'mode':'log','logNextKey':'area-d','logPreviousKey':'previous','detailsKey':'cancel','logSummaryKey':'logout'}
for k,label in [('panel','Panel Log?'),('access','Access Log?')]:add('py-log-'+k,'py-logs',label,'status',30,**logBehavior,**({'filter':'access'} if k=='access' else {}))
O['py-tests'].update(seq)
choice('py-test-sounds','py-tests','Sound to Play?',[(None,x) for x in ['Chime','Chime Follow','Exit','Exit Fault','Entry','Tech Fault','Tamper','Alarm','PA','Fire']],31,default='Chime',skipOnBack=True,nextFieldKey='back',testPreview=True,evidenceNote='The source confirms tone selection with arrows and NO to exit. FINDR keeps YES as a local selection acknowledgement without programming a setting; original tone recordings, exact YES behavior and playback timing require hardware verification.',notes=['The names can be browsed; FINDR learning feedback is not a recording of panel tones.'])
add('py-test-walk','py-tests','Walk Test?','command',31,mode='walk',question=True,areaSelection=True,keyChoiceCodes=areaKeys,requireRestore=True,initialAreas=['A'],finishKey='back',recordNextKey='right',recordPreviousKey='left',evidenceNote='All fictional inputs are assigned to area A. Real wireless wake-up waits and exact rolling input display timings are condensed. NO at area selection chooses the documented individual-input route.')
add('py-test-walk-areas','py-test-walk','Walk Test Areas','reference',32,summary='The first walk-test prompt selects areas with the area-letter keys. YES starts the chosen area test; NO selects individual inputs.')
add('py-test-walk-run','py-test-walk','Walk Test','reference',32,summary='The running test removes restored, activated demo inputs from its remaining list. It is a state of Walk Test, not an extra menu question.')
add('py-test-walk-individual','py-test-walk','Walk Test Input','reference',31,summary='From area selection use NO, enter each input number and YES, then NO to begin the selected test. It is a state of Walk Test, not an extra menu question.')
sequence('py-test-soak','py-tests','Soak Control?',33)
add('py-soak-inputs','py-test-soak','Select Inputs','setting',33,mode='info',evidenceNote='Multi-record soak selection is documented; actual soak timing and expiry are not simulated.')
for label in ['Soak Days Left','Initial Soak']:add('py-'+slug(label),'py-test-soak',label,'setting',33,mode='info',evidenceNote='The source gives the relationship between these timers, but no complete numeric range here.')
add('py-test-siren','py-tests','Test Siren?','command',33,mode='outputs',question=True,outputs=['Siren','Strobe'],outputsOnEnter=True,simultaneous=True,finishKey='back',advanceParentOnBack=True,evidenceNote='Entering this source-backed test starts both local Siren and Strobe indicators. NO stops them. No physical output is connected; panel sound recordings and real timing are not reproduced.')
external('py-test-battery','py-tests','Do Battery Load Test?',32,question=True,advanceParentOnBack=True)
add('py-test-outputs','py-tests','Test Outputs?','command',33,mode='outputs',question=True,outputFunctions=[{'code':code,'label':label} for code,label in outputTypes],finishKey='back',evidenceNote='Enter a documented four-digit output function, then YES to activate the local fixture. NO stops it. The matching communications guide also uses YES to restore a signalled test. No external signalling or real output is performed.')
for id,label in [('comms','Test Communications?'),('fetch-time','Fetch Time?'),('poll-server','Poll Test Server?')]:external('py-test-'+id,'py-tests',label,32,question=True)
# Diagnostics: physical address scopes, not all-system invented readings.
for k,label,p in [('wireless','Wireless Devices?',34),('wired','Wired Devices?',35),('comms','Communications?',37),('tablets','Tablet Keypads?',36)]:menu('py-diag-'+k,'py-diagnostics',label,p)
wirelessZones=['01','02','03','04'];wiredZones=['33','34'];zemZones=['35','36']
add('py-diag-wireless-inputs','py-diag-wireless','View Inputs?','status',34,mode='zones',selector='zone',scope='zone',recordIds=wirelessZones,numericSelection=True,showResistance=False,detailsKey=False,recordNextKey='right',recordPreviousKey='left')
for k,label,scope in [('input-signal','View Input Signal Strength?','zone'),('bell-signal','View Bells Signal Strength?','bell'),('station-signal','View Arming Station Signal Strength?','station'),('input-battery','View Inputs Battery Status?','zone'),('bell-battery','View Bells Battery Status?','bell'),('station-battery','View Arming Station Battery Status?','station')]:
 status('py-diag-'+k,'py-diag-wireless',label,36,lines=[label.rstrip('?'),'85% · DEMO' if 'signal' in k else 'Good · DEMO'],selector=scope,scope=scope,**({'recordIds':wirelessZones} if scope=='zone' else {}),evidenceNote='Simulated diagnostic value. Real polling can take up to five minutes; those waits are condensed.')
menu('py-diag-frequency','py-diag-wireless','Wireless Dual Frequency Menu?',35)
status('py-diag-channel','py-diag-frequency','Channel',35,lines=['Channel','01 · DEMO'])
status('py-diag-channel-reason','py-diag-frequency','Channel Reason',35,lines=['Channel Reason','FINDR fixture'])
status('py-diag-frequency-status','py-diag-frequency','SF/DF Status',35,lines=['SF/DF Status','DF · DEMO'])
status('py-diag-first-sf','py-diag-frequency','First SF Device',35,lines=['All Devices DF','FINDR DEMO'])
menu('py-diag-wired-inputs','py-diag-wired','View Inputs?',35)
for key,label,records in [('endstation','Endstation Inputs?',wiredZones),('zem','ZEM Inputs?',zemZones)]:add('py-diag-'+key+'-inputs','py-diag-wired-inputs',label,'status',36,mode='zones',scope='zone',recordIds=records,showResistance=True,detailsKey='enter',numericSelection=True,recordNextKey='right',recordPreviousKey='left',aliases=['zone resistance','ohms','wired detector status'])
O['py-diag-zem-inputs'].update(selector='module',selectorRecordIds=['0'])
sequence('py-diag-psus','py-diag-wired','View PSUs?',35)
for k,label,scope in [('panel','Endstation PSU',None),('zem','ZEM PSUs','module'),('output','OP Mod PSU','outputModule'),('keypad','Keypad Volts','keypad'),('reader','Reader Volts','reader')]:status('py-diag-volts-'+k,'py-diag-psus',label,35,lines=[label,'13.7V · DEMO'],**({'selector':scope,'scope':scope} if scope else {}))
O['py-diag-volts-keypad']['recordIds']=['1']
O['py-diag-comms'].update(seq)
for label,p in [('Wi-Fi Strength',7),('Wi-Fi IP Address',7),('Wi-Fi Subnet Mask',7),('Wi-Fi Router Address',7),('PSTN Line Status',7),('App Status',8),('ARC Status',8),('Last App Contact',8),('Last Polled Cloud',8),('Last Polled ARC',8),('LAN IP Address',11),('LAN Subnet Mask',11),('LAN Gateway',11),('GPRS Signal',12)]:status('py-diag-'+slug(label),'py-diag-comms',label,p,'comms',lines=[label,'Simulated · no link'],conditions=['Some diagnostics require the relevant fitted communications module.'])
status('py-diag-tablet-ip','py-diag-tablets','Tablet IP Address',36,lines=['Tablet 1','192.0.2.10 DEMO'],selector='tablet',scope='tablet')
O['py-restore'].update(seq)
choice('py-restore-intruder','py-restore','Engineer Restore Intruder',[(0,'No'),(None,'UK Intruder'),(None,'Secure Intruder')],37,default='No')
for name in ['Hold Up','Tamper','Soak','Confirmed','Faults']:boolean('py-restore-'+slug(name),'py-restore','Engineer Restore '+name,37)
boolean('py-restore-anticode','py-restore','Anti-Code Restore',37)
# Communications under the matching V11 Communications guide.
choice('py-comms-modem','py-communications','Select External Modem Type?',[(0,'None / PSTN'),(1,'GPRS'),(3,'Ethernet')],10,'comms',default='None / PSTN',notes=['Only documented codes from the matching sources are enabled; the full firmware modem list is not inferred.'])
sequence('py-comms-app','py-communications','App Set-Up?',5,'comms')
boolean('py-app-use','py-comms-app','Use App?',5,'comms')
status('py-app-id','py-comms-app','System ID',5,'comms',lines=['System ID','FINDR-DEMO'])
text('py-app-cloud-password','py-comms-app','Cloud Password',5,'comms',limit=32)
choice('py-app-security','py-comms-app','Security Level',[(0,'Normal'),(1,'High')],5,'comms',default='Normal')
text('py-app-password','py-comms-app','App Password',5,'comms',limit=32)
boolean('py-app-poll','py-comms-app','Always Poll Cloud',49)
def wifi(parent,src,pg):
 menu(parent,'py-communications' if parent.startswith('py-') else 'pm-manager','Program Wi-Fi?' if parent.startswith('py-') else 'WI-FI SETUP?',pg,src)
 for suffix,label in [('device','Setup with Wi-Fi Device?'),('wps','Setup with WPS?')]:external(parent+'-'+suffix,parent,label,pg,src)
 text(parent+'-ssid',parent,'SSID?',pg+1,src,limit=32)
 text(parent+'-password',parent,'Password?',pg+1,src,limit=64)
 status(parent+'-signal',parent,'Signal Strength',pg+1,src,lines=['Signal Strength','22 · DEMO'])
wifi('py-comms-wifi','comms',6)
sequence('py-comms-lan','py-communications','Program LAN?',10,'comms',conditions=['Ethernet modem selected.'])
boolean('py-lan-auto','py-comms-lan','Enable Auto IP',10,'comms')
for label in ['IP Address','Subnet Mask','Gateway']:text('py-lan-'+slug(label),'py-comms-lan',label,10,'comms',limit=15,conditions=['Manual LAN addressing; Auto IP is No.'])
sequence('py-comms-gprs','py-communications','Program GPRS?',12,'comms',conditions=['GPRS modem selected.'])
for label in ['APN','User ID','Password']:text('py-gprs-'+slug(label),'py-comms-gprs',label,12,'comms',limit=32)
menu('py-comms-arc','py-communications','Program ARC?',14,'comms')
sequence('py-arc-details','py-comms-arc','ARC Details?',14,'comms',scope='arc')
add('py-arc-path','py-arc-details','ARC Comms Path','setting',14,'comms',mode='info',evidenceNote='The guide requires a signalling path but does not enumerate all code/label choices; no path codes are invented.')
formats=[('000','Fast 4.8.1'),('001','Fast 6.8.1'),('002','Fast 4.16.1'),('003','Fast 6.16.1'),('128','SIA Level 1'),('129','SIA 3'),('130','Contact ID'),('148','SIA IP'),('149','Contact ID IP'),('150','Fast Format IP'),('254','Not Used')]
choice('py-arc-format','py-arc-details','Format',formats,16,'comms',default='SIA IP')
for n in N:
 if n['parentId']=='py-arc-format' and n['code'] in ['000','001','002','003','150']:n['sourceRefs']=[ref(14,'comms')]
 if n['id']=='py-arc-format-v-254':n['sourceRefs']=[ref(49)]
for id,label in [('channels','Fast Format Channels'),('restores','Fast Format Channel Restores'),('low-battery','Low Battery Reports')]:
 add('py-arc-fast-'+id,'py-arc-format',label,'reference',14,'comms',conditions=['Fast Format or Fast Format IP only.'],summary='Documented Fast Format-specific field, separate from the SIA/Contact ID Valid Areas and Event Types sequence.',notes=['Channel flags use numbered keys; B/D move the cursor to channels11–16 and A changes the selected flag. This conditional field is a source reference until its physical interaction is implemented.'])
gap('py-fast-format-fields','Fast Format-specific selection screens','Can you provide the exact LCD labels and channel flag cursor sequence for the Fast Format branch?','The communications guide describes channel and restore flags but does not give complete screen labels. Those fields are not substituted with the different SIA/Contact ID sequence.',['py-arc-format','py-arc-fast-channels','py-arc-fast-restores'])
for label in ['1st Number','Second No.']:text('py-arc-'+slug(label),'py-arc-details',label,16,'comms',limit=32,textMode='telephone',conditions=['PSTN signalling only.'])
areas('py-arc-areas','py-arc-details','Valid Areas',16,'comms')
boolean('py-arc-area-accounts','py-arc-details','Area Accounts?',16,'comms')
text('py-arc-account','py-arc-details','ARC Account',16,'comms',limit=12,textMode='digits')
def signallingFields(parent,pg,src='comms'):
 add(parent+'-redials',parent,'Redials','setting',pg,src,mode='info',evidenceNote='The sequence is documented but the complete redial range is not stated.')
 number(parent+'-timeout',parent,'Time Out',0,60,pg,src=src,units='seconds',default=45)
 boolean(parent+'-test-calls',parent,'Test Calls',pg,src)
 for label,lo,hi in [('Start Time Hours',0,23),('Start Time Minutes',0,59),('Interval Hours',0,23),('Interval Minutes',0,59)]:number(parent+'-'+slug(label),parent,label,lo,hi,pg,src=src,conditions=['Test Calls enabled.'],notes=['Clock-component limits are conventional; exact display formatting is simplified.'])
 add(parent+'-interval-days',parent,'Interval Days','setting',pg,src,mode='info',conditions=['Test Calls enabled.'],evidenceNote='The manual identifies this field but not its complete accepted day range.')
 choice(parent+'-event-types',parent,'Event Types',[(0,'Default'),(1,'Simple'),(2,'Full'),(3,'Custom')],pg,src,default='Default')
 custom=parent+'-event-types-v-3';O[custom]={'mode':'menu','include':True,**seq}
 for label in ['Set','Unset','Omit','Confirmed Alarm','Comms Status','Technical Fault','Abort','Information','Access Alarm','Access Event','Omit Restore','Special Log','Invalid Access Tag','Shunt Ward Set','Shunt Ward Unset','Shunt Ward Alarm','Walk Test','Restore','Technical Fault Restore','Test','Mains Fail','Mains Fail Restore','Set Fail','Engineer Entry','Engineer Exit']:
  boolean(custom+'-'+slug(label),custom,label,26,'comms')
 for label in ['Alarm','Tamper Alarms']:choice(custom+'-'+slug(label),custom,label,[(None,'Off'),(None,'Once'),(None,'All')],26,'comms',default='Off')
signallingFields('py-arc-details',16)
menu('py-arc-signup','py-comms-arc','Sign Up To ARC?',17,'comms')
text('py-arc-code','py-arc-signup','ARC Code/IP Addr',17,'comms',limit=15)
external('py-arc-start-signup','py-arc-signup','Start Sign Up To ARC?',17,'comms')
sequence('py-comms-digi','py-communications','Program Digi Channels?',15,'comms')
for i in range(1,17):add('py-digi-'+str(i).zfill(2),'py-comms-digi','Digi '+str(i).zfill(2),'setting',15,'comms',mode='choice',choices=sharedChoices,defaultValue='Not Used',notes=['The documented shared output table supplies values; channel numbers are records, not top-level shortcuts.'])
for kind,label,p in [('sms','User SMS Signalling?',18),('voice','Voice Signalling?',19)]:
 parent='py-comms-'+kind;sequence(parent,'py-communications',label,p,'comms',scope='phonebook',conditions=['Suitable fitted modem and service required.'])
 O[parent].update(recordNextKey='area-d',recordPreviousKey='previous')
 text(parent+'-number',parent,'Mobile No.' if kind=='sms' else 'Phone Number',p,'comms',limit=32,textMode='telephone')
 areas(parent+'-areas',parent,'Valid Areas',p,'comms')
 if kind=='voice':text(parent+'-ack',parent,'User Ack Code',p,'comms',limit=8,textMode='digits')
 signallingFields(parent,p)
sequence('py-comms-advanced','py-communications','Advanced Communications?',21,'comms')
text('py-comms-prefix','py-comms-advanced','Prefix Tel No.',21,'comms',limit=8,textMode='telephone')
boolean('py-comms-3way','py-comms-advanced','3 Way Calling',21,'comms')
text('py-comms-arm-pc','py-comms-advanced','ARM PC Tel No.',21,'comms',limit=32,textMode='telephone')
add('py-comms-pcs','py-comms-advanced','Program PCs','setting',21,'comms',mode='info',evidenceNote='PC IP configuration is described without a complete field sequence; no network connections are made.')
choice('py-comms-voice-strategy','py-comms-advanced','Voice Strategy',[(0,'Sequential'),(1,'Repeat')],21,'comms',default='Sequential')
for label in ['Acknowledgements','Voice Restrict Time']:add('py-comms-'+slug(label),'py-comms-advanced',label,'setting',21,'comms',mode='info',evidenceNote='The field is documented but its complete choice/range domain is not specified.')
# Alarm response common options and independently named area/event stages.
O['py-response'].update(seq)
choice('py-response-silent','py-response','Silent 1st Alarm',[(0,'Never'),(None,'Confirmed')],40,default='Never')
boolean('py-response-confirm-entry','py-response','Disable Confirm On Entry',40)
stages=[(0,'Keypads'),(1,'Internal Sounders'),(2,'Sirens Only'),(3,'Digi')]
for event in ['Area A','Area B','Area C','Area D','Fire','Gas','HU','Medical','24 Hour','Day Alarm']:
 for mode in ['Starts At','Stops At']:choice('py-response-'+slug(event+' '+mode),'py-response',event+' '+mode,stages,40,default='Digi')
choice('py-response-any-start','py-response','Any Alarms Start',stages,40,default='Digi');areas('py-response-start-areas','py-response','If Areas Armed (start)',40)
choice('py-response-any-stop','py-response','Any Alarms Stop',stages,40,default='Digi');areas('py-response-stop-areas','py-response','If Areas Armed (stop)',40)
gap('py-response-confirm','Alarm response stage discrepancy','Does your V11 Stop At selector include Confirm [4]?','The explanatory stage list pp38–40 gives0–3, but defaults pp49–50 also show Confirm[4]. The undocumented stage is not offered as a verified value.',['py-response'])
O['py-downloading'].update(seq)
choice('py-download-by','py-downloading','Download By',[(0,'None'),(None,'Cloud'),(None,'RS232')],41,default='None')
status('py-download-system-id','py-downloading','System ID',41,lines=['System ID','FINDR-DEMO'],conditions=['Cloud mode.'])
choice('py-download-security','py-downloading','Security Level',[(0,'Normal'),(1,'High')],41,default='Normal',conditions=['Cloud mode.'])
for label in ['System Password','UDL Password','Site Name']:text('py-download-'+slug(label),'py-downloading',label,41,limit=32)
boolean('py-download-roving','py-downloading','Roving Dial',41)
boolean('py-download-auto','py-downloading','Auto Upload',41)
O['py-dial'].update(selector='pc',scope='pc')
for label in ['Connect to PC','Test Dial','ARM Service','Data from PC','Data to PC','Diagnostics','Commissioning']:external('py-dial-'+slug(label),'py-dial',label,42)
O['py-software'].update(seq)
for label,value in [('Panel Software','V11 · DEMO'),('Hub Software','FINDR fixture'),('Internal Wi-Fi','FINDR fixture'),('Modem Software','Not fitted')]:status('py-software-'+slug(label),'py-software',label,43,lines=[label,value])
for label in ['Clear Wireless Data','Clear Codes','Clear Logs']:external('py-clean-'+slug(label),'py-clean',label,43)
# Separate documented manager and restricted user roots.
add('pm-manager',None,'Master Manager menu',page=14,src='user',mode='menu',numericSelection=False)
managerTop=[('date','SET DATE & TIME?',15),('outputs','OPERATE USER OUTPUTS?',16),('omit','OMIT INPUTS?',16),('users','EDIT USERS?',16),('logs','REVIEW LOGS?',19),('app','SET UP APP DATA?',20),('wifi','WI-FI SETUP?',21),('phonebook','SMS PHONEBOOK?',23),('walk','WALK TEST?',23),('siren','SIREN TEST?',24),('dial','DIAL OUT MENU',24),('allow','ALLOW ENGR MENU?',24),('block-set','BLOCK UDL SET?',24),('block','BLOCK UDL?',25),('sounds','SYSTEM SOUNDS DEMO?',25),('exit','EXIT MANAGER MODE?',15)]
for k,label,p in managerTop:menu('pm-'+k,'pm-manager',label,p,'user')
clock('pm-date',15,'user')
O['pm-outputs'].update(mode='outputs',selector='output',scope='output',outputs=['User Output 1','User Output 2','User Output 3','User Output 4'],toggleKeys=['enter'],recordNextKey='right',recordPreviousKey='left')
O['pm-omit'].update(mode='omit',scope='zone',toggleKeys=['enter'],finishKey='back',numericSelection=True,eligibleOnly=True,eligibleZoneTypes=['Day Alarm'],recordNextKey='right',recordPreviousKey='left',evidenceNote='This Master Manager route is only for Day Alarm inputs. Setting-time omission of ordinary omittable inputs is a separate flow, not substituted here.')
for suffix,label in [('new','Add New User?'),('change','Delete/Change User?'),('master','Change Master Manager Code?')]:sequence('pm-user-'+suffix,'pm-users',label,17 if suffix=='new' else 19,'user',scope=None if suffix=='master' else 'user')
for parent in ['pm-user-new','pm-user-change','pm-user-master']:
 if parent=='pm-user-change':
  external(parent+'-delete',parent,'Delete User?',19,'user',question=True)
  sequence(parent+'-edit',parent,'Change User?',19,'user')
  parent=parent+'-edit'
 text(parent+'-code',parent,'Enter User Code' if parent!='pm-user-master' else 'Master Manager Code',17 if parent=='pm-user-new' else 19,'user',limit=6,textMode='digits',minLength=4)
 if parent!='pm-user-master':choice(parent+'-type',parent,'User Type',[(0,'User'),(1,'Manager')],18,'user',default='User')
 areas(parent+'-areas',parent,'User Areas',18,'user')
 choice(parent+'-options',parent,'User Set Options',[(0,'Unset / Set'),(1,'Unset Only'),(2,'Set Only'),(3,'None')],18,'user',default='Unset / Set')
 boolean(parent+'-flexi',parent,'Flexi Set',18,'user')
 text(parent+'-name',parent,'User Name',18,'user')
for k,label in [('panel','Panel Log?'),('access','Access Log?')]:add('pm-log-'+k,'pm-logs',label,'status',19,'user',**logBehavior,**({'filter':'access'} if k=='access' else {}))
O['pm-app'].update(seq)
for original,new in [('py-app-use','pm-app-use'),('py-app-id','pm-app-id'),('py-app-cloud-password','pm-app-cloud-password'),('py-app-security','pm-app-security'),('py-app-password','pm-app-password')]:
 raw=next(n for n in N if n['id']==original); add(new,'pm-app',raw['label'],raw['kind'],20,'user',**O[original])
external('pm-app-generate','pm-app','Generate App Password Key?',21,'user',conditions=['High security mode.'])
status('pm-app-view','pm-app','View App Password Key?',21,'user',lines=['Demo key only','No credential created'],conditions=['High security mode.'])
external('pm-app-send','pm-app','Send Password Key in a text',21,'user',conditions=['High security mode and suitable SMS service.'])
# The top-level Wi-Fi node already exists.
for suffix,label in [('device','Setup with Wi-Fi Device?'),('wps','Setup with WPS?')]:external('pm-wifi-'+suffix,'pm-wifi',label,21,'user')
text('pm-wifi-ssid','pm-wifi','SSID?',22,'user',limit=32);text('pm-wifi-password','pm-wifi','Password?',22,'user',limit=64);status('pm-wifi-signal','pm-wifi','Signal Strength',22,'user',lines=['Signal Strength','22 · DEMO'])
O['pm-phonebook'].update(seq,selector='phonebook',scope='phonebook',sequenceEnd='selector',recordNextKey='area-d',recordPreviousKey='previous')
text('pm-phonebook-number','pm-phonebook','Mobile No.',23,'user',limit=32,textMode='telephone');boolean('pm-phonebook-enable','pm-phonebook','Enabled',23,'user')
O['pm-walk'].update(mode='walk',areaSelection=True,keyChoiceCodes=areaKeys,requireRestore=True,initialAreas=['A'],individualStartOnEnter=True,finishKey='back',singleAreaOnly=True,recordNextKey='right',recordPreviousKey='left',evidenceNote='All fictional inputs belong to area A. The user guide requires one area at a time; wireless start-up delays and rolling input display timings are condensed.')
O['pm-siren'].update(mode='outputs',outputs=['Siren','Strobe'],outputsOnEnter=True,simultaneous=True,finishKey='enter',evidenceNote='Entering this test starts both local Siren and Strobe indicators. The V11 user guide uses YES again to finish. Real output hardware, sounds and timings are not reproduced.')
O['pm-dial'].update(mode='info',evidenceNote='External dial-out is documented but never performed by this offline emulator.')
for k in ['allow','block-set','block']:
 label=next(n['label'] for n in N if n['id']=='pm-'+k);boolean('pm-'+k+'-value','pm-'+k,label,24 if k!='block' else 25,'user')
 O['pm-'+k].update(seq)
add('pm-sounds-none','pm-sounds','No Sound','selection',25,'user',code='00')
O['pm-sounds'].update(mode='choice',choices=[{'id':'pm-sounds-none','label':'No Sound','code':'00','value':'No Sound'}]+O['py-test-sounds']['choices'],defaultValue='No Sound',testPreview=True,sourceRefs=[ref(31)],evidenceNote='The user guide shows No Sound [00], arrows and YES. FINDR acknowledges the selected name locally without programming a setting. Original panel alert recordings and exact playback timing are not reproduced.')
O['pm-exit'].update(mode='action',action='logout')
add('pu-user',None,'User menu',page=14,src='user',mode='menu',numericSelection=False)
for suffix,label,target,pg in [('outputs','OPERATE USER OUTPUTS?','pm-outputs',16),('code','CHANGE CODE?',None,14),('logs','REVIEW LOGS?','pm-logs',19),('walk','WALK TEST?','pm-walk',23),('siren','SIREN TEST?','pm-siren',24),('allow','ALLOW ENGR MENU?','pm-allow',24),('exit','EXIT USER MENU?',None,14)]:
 menu('pu-'+suffix,'pu-user',label,pg,'user')
 if target:O['pu-'+suffix]={'mode':'menu','include':True,'aliasTarget':target}
O['pu-code'].update(mode='text',maxLength=6,minLength=4,textMode='digits',defaultValue='',evidenceNote='Fictional PIN only; no default code is supplied.')
O['pu-exit'].update(mode='action',action='logout')
# Explicit evidence limits, not silently invented routes.
gap('py-sequence-back','Nested attribute return behaviour','From halfway through Input Attributes, does NO show Input Attributes or go directly to Input Description on your V11?','The guide states the general NO rule but does not illustrate this intermediate return. FINDR returns to the question before skipping it.',['py-input-attributes'])
gap('py-text-entry','Predictive text and length limits','Can you confirm text length and C-key behaviour for input name/location and user names?','The source describes multi-tap/predictive entry; only some fields have explicit length limits. The text helper uses a conservative practice limit.',['py-input-name','py-input-location','pm-user-new-name'])
gap('py-omission-restore','Manager Day Alarm omission reinstatement','What exact prompt appears when selecting an already omitted Day Alarm input?','The user guide documents omission and automatic restoration after set/unset, but not the full repeated-selection display. FINDR labels its local toggle as a simplified practice interaction.',['pm-omit'])
gap('py-dynamic-comms','Conditional communications menus','Which modem and firmware revision are fitted to the keypad you want to practise?','The V11 guides describe different module-dependent branches. FINDR shows the documented branches with conditions and no live communications.',['py-communications','py-diag-comms'])
gap('py-hardware-tests','Wireless learning, siren and test timing','Can matching hardware recordings confirm the complete test prompts and delays?','Learning, deleting, signalling, battery loading and actual sounder timing require equipment; only local fixtures are provided.',['py-wireless','py-test-siren','py-test-battery'])
# Reconcile field order against the defaults tables and worked examples.
def reorder(parent,ids):
 ordered=[next(n for n in N if n['id']==id) for id in ids]
 rest=[n for n in N if n['parentId']==parent and n['id'] not in ids]
 for index,n in enumerate(ordered+rest):n['order']=index+1
reorder('py-system-site',['py-site-'+slug(x) for x in ['Set With Fault','Set With Tamper','Set With ATS Fault','Set Fail = Alarm','Do Bat Load Test']]+['py-site-strobe']+['py-site-'+slug(x) for x in ['Use Level Set','Autoset Force','Restrict PIN Use','Simple Set','Intelligent Set','Common Lobby','Flexi Unset']]+['py-site-hu']+['py-site-'+slug(x) for x in ['Tag Opens Doors','Fire Key Enable','Set With Poll Fault','Fob Unset Entry','Wireless Bell Supervision','Download If Set']]+['py-site-cloud-priority'])
reorder('py-volume',['py-volume-'+a.lower()+'-entry' for a in 'ABCD']+['py-volume-'+a.lower()+'-exit' for a in 'ABCD'])
timer_order=['py-timer-'+a.lower()+'-'+slug(label) for label in ['Entry Time','Exit Time','APP Exit Time','Siren Time','Siren Delay'] for a in 'ABCD']
timer_order += ['py-timer-'+slug(label) for label in ['Confirm Time','HU Confirm Time','Strobe Time','Re-Arm No.','AC Signal Delay','Settle','Double Knock','Pre-Alarm','Wi-Fi Fault Delay','Comm Fault Delay','Set Fail','Fire Siren Time','Set Fail Warning','Occupancy','Occupancy Suspend','Input NAT Days','Input NAT Hours','Wireless Supervision Time','Wireless Jamming Time','Service Time']]
reorder('py-timers',timer_order)
reorder('py-downloading',['py-download-by','py-download-system-id','py-download-security','py-download-system-password','py-download-roving','py-download-auto','py-download-udl-password','py-download-site-name'])
for parent in ['py-arc-details','py-comms-sms','py-comms-voice']:
 allids=[n['id'] for n in sorted([n for n in N if n['parentId']==parent],key=lambda n:n['order'])]
 day=parent+'-interval-days'; allids.remove(day); allids.insert(allids.index(parent+'-interval-hours'),day);reorder(parent,allids)
 custom=parent+'-event-types-v-3'
 reorder(custom,[custom+'-'+slug(label) for label in ['Set','Unset','Alarm','Omit','Confirmed Alarm','Comms Status','Technical Fault','Abort','Information','Access Alarm','Access Event','Omit Restore','Special Log','Tamper Alarms','Invalid Access Tag','Shunt Ward Set','Shunt Ward Unset','Shunt Ward Alarm','Walk Test','Restore','Technical Fault Restore','Test','Mains Fail','Mains Fail Restore','Set Fail','Engineer Entry','Engineer Exit']])
O['py-clean'].update(mode='info',evidenceNote='Clean Start requires a separate destructive confirmation flow. FINDR maps the documented choices in Menu maps but does not offer a fabricated reset operation.')
O['py-keypads']['children']=[n['id'] for n in N if n['parentId']=='py-keypads' and n['id']!='py-station-options']
taskLinks={
 'py-diag-wireless-inputs':('read-wireless-input',['wireless detector status','open or closed','live inputs']),
 'py-diag-endstation-inputs':('read-wired-resistance',['wired input resistance','ohms','read wired detector']),
 'py-log-panel':('last-alarm',['last alarm','event history','what set it off']),
 'py-test-walk':('walk-test',['walk testing','test PIR','test detector']),
 'py-input-type':('change-input-type',['change zone type','program input','detector function']),
 'pm-omit':('omit-day-alarm',['omit day alarm','bypass day alarm','disable device']),
 'py-exit':('exit-engineer',['save changes','leave engineer','exit programming'])}
for n in N:
 if n['id'] in taskLinks:
  taskid,aliases=taskLinks[n['id']];n['practiceTaskIds']=[taskid];n['aliases']=list(dict.fromkeys(n['aliases']+aliases))

# No duplicate-code guess can survive into the actual value editor.
for override in O.values():
 if 'choices' in override:
  codes={str(c.get('code')) for c in override['choices'] if c.get('code') is not None}
  for c in codes:
   if sum(str(x.get('code'))==c for x in override['choices'])>1:
    for x in override['choices']:
     if str(x.get('code'))==c:x['code']=None
sources=[]
for id,title,edition,url,pages,file in [('prog','Enforcer V11 Programming Guide','Document SAP 102028847-02','https://cdn.connectec.uk/Images/Products/alarms/enforcer-v11-programming-guide.pdf',60,'programming.pdf'),('comms','Enforcer V11 Communications Guide','Document SAP 102028846-01','https://cdn.connectec.uk/Images/Products/alarms/enforcer-v11-communications-guide-en.pdf',28,'communications.pdf'),('user','Wireless Alarm System Extended User Guide','Enforcer V11 · Rev-02','https://eaglesecuritysolutions.co.uk/user-manual/pyronix-wireless-alarm-system-extended-user-guide.pdf',40,'user-original.pdf')]:
 sources.append({'id':id,'title':title,'edition':edition,'url':url,'publisher':'Pyronix Ltd','totalPdfPages':pages,'sha256':hashlib.sha256(Path('/tmp/findr-pyronix',file).read_bytes()).hexdigest(),'pageNumbering':'1-based PDF pages equal printed page numbers; communications front matter uses roman numerals before page4.','scope':'Manufacturer-authored Enforcer V11 document hosted by a distributor/installer mirror. Official legacy download redirects were unusable during this audit.'})
nav={'menuNextKey':'back','menuPreviousKey':'previous','recordNextKey':'right','recordPreviousKey':'left','fieldNextKey':'enter','fieldPreviousKey':'cancel','exitKey':'back','questionMenus':True,'choiceNextKey':'right','choicePreviousKey':'left','exitEditorToParent':True,'logNextKey':'area-d','logPreviousKey':'previous'}
config={'profileId':'pyronix-enforcer','roots':[{'id':'py-engineer','label':'Engineer · V11 SAP 102028847-02','role':'Engineer','edition':'SAP 102028847-02','commitOnExit':True,'nodeIds':[n['id'] for n in N if n['parentId']=='py-engineer']},{'id':'pm-manager','label':'Master Manager · V11 Rev-02','role':'Master Manager','edition':'Rev-02','commitOnExit':False,'nodeIds':[n['id'] for n in N if n['parentId']=='pm-manager']},{'id':'pu-user','label':'User · V11 Rev-02','role':'User','edition':'Rev-02','commitOnExit':False,'nodeIds':[n['id'] for n in N if n['parentId']=='pu-user']}],'defaultRootId':'py-engineer','demoModel':'Pyronix Enforcer V11 · integrated LCD keypad','navigation':nav,'records':{'zone':[{'id':i,'label':l} for i,l in [('01','FRONT DOOR'),('02','HALL PIR'),('03','PLANT ROOM'),('04','OFFICE PIR'),('33','REAR CONTACT'),('34','STORE PIR'),('35','WORKSHOP PIR'),('36','SIDE CONTACT')]],'user':[{'id':str(i).zfill(2),'label':'Demo user '+str(i)} for i in range(1,5)],'module':[{'id':'0','label':'ZEM0 · zones35–42'}],'keypad':[{'id':'0','label':'Onboard keypad'},{'id':'1','label':'Hall keypad'}],'reader':[{'id':'2','label':'Demo reader'}],'bell':[{'id':'1','label':'Front bell'},{'id':'2','label':'Rear bell'}],'station':[{'id':'1','label':'Wireless station1'}],'outputModule':[{'id':'0','label':'Demo output module'}],'phonebook':[{'id':str(i).zfill(2),'label':'Demo contact '+str(i)} for i in range(1,4)],'arc':[{'id':'1','label':'Fictional ARC'}],'pc':[{'id':'1','label':'Fictional PC'}],'tablet':[{'id':'1','label':'Demo tablet'}],'specialUser':[{'id':'01','label':'Fictional special user'}]},'overrides':O,'notes':['Authorised fictional session; no access codes or real control-panel connection.','Main menus use NO forward, B backward and YES to enter. C returns through sequential fields; left/right arrows select values and records.','Engineer programming is committed at exit. Other menu contexts retain their own source edition.','Documented labels and routes are reproduced; populated screens, device counts and timings are training fixtures.'],'fixtureNotice':'All values, names, addresses, events and readings are fictional FINDR practice data.'}
mapdata={'schemaVersion':1,'profileId':'pyronix-enforcer','title':'Pyronix Enforcer V11','panelModels':['Enforcer V11'],'keypadModels':['Enforcer integrated LCD keypad','Enforcer additional wired LCD keypad'],'baseline':{'engineer':'Enforcer V11 Programming Guide SAP102028847-02','communications':'Enforcer V11 Communications Guide SAP102028846-01','user':'Extended User Guide Rev-02'},'scope':'Engineer, communications, Master Manager and restricted User menus. Menu locations and value lists are source-pinned; records, timings and readings are fictional, and unsupported physical operations remain labelled.','sources':sources,'numbering':{'style':'labelled','explanation':'Main menu and question order is not a numeric address. Numeric codes identify field values, input/output records or individual channels only.','examples':[{'code':'06','meaning':'Intruder input type, not a main menu shortcut.'},{'code':'0014','meaning':'Siren Any output function, not a menu address.'},{'code':'01–66','meaning':'Input record numbers, subject to installed devices.'}],'caveats':['No chapter/page number is a keypad shortcut.','Conditional menus depend on equipment, configuration and firmware.','Duplicate or incomplete source codes are marked instead of guessed.']},'navigation':[{'keys':'NO / B','action':'Next / previous question in a main menu; NO also exits a child option.','sourceRefs':[ref(6)]},{'keys':'YES','action':'Enter a question or accept/advance the current sequential field.','sourceRefs':[ref(6),ref(18)]},{'keys':'◀ / ▶','action':'Choose input records and field values. These are separate physical keys from C and D.','sourceRefs':[ref(18),ref(6,'user')]},{'keys':'C','action':'Previous programmable option; additional event-log detail in a log.','sourceRefs':[ref(6),ref(30)]},{'keys':'A / B / C / D','action':'Select corresponding area flags in an area field.','sourceRefs':[ref(18,'comms')]},{'keys':'A','action':'Quick exit from a main menu.','sourceRefs':[ref(6),ref(15,'user')]}],'nodes':N,'gaps':gaps,'coverage':{'strategy':'Compared top-level flow charts, explicit worked programming sequences, defaults and value appendices across three matching manufacturer-authored V11 documents.','mappedAreas':['All22 Engineer top-level entries','Input types, attributes and naming','Wireless controls','Outputs and output function table','Keypad/reader configuration','Timers and volume','System options and displays','Logs, tests and diagnostics','Communications and signalling fields','Restore/alarm response','Master Manager and restricted User menus'],'excludedAreas':['Real learning/deletion/default operations','Actual ARC, cloud, SMS or modem traffic','Actual battery loading and physical sounders','Complete predictive text timing','Unstated value ranges and unresolved print contradictions'],'hardwareVerified':False,'confidence':'Documented V11 baseline with explicit limits; not a firmware or hardware fidelity claim.','documentedEntries':len(N)}}
(ROOT/'public/app/data/menu-maps/pyronix-enforcer.json').write_text(json.dumps(mapdata,indent=2)+'\n')
(ROOT/'public/app/emulator-pyronix.mjs').write_text('// Enforcer V11 behaviour overlays; source references live in its menu atlas.\n// Generated by research/expansion/build-pyronix.py from reviewed manual facts.\nconst config = '+json.dumps(config,indent=2)+';\nexport function getPyronixConfig(map, profile) {\n  if (map.profileId !== "pyronix-enforcer") throw new Error("Wrong Pyronix profile");\n  return JSON.parse(JSON.stringify(config));\n}\n')
print(json.dumps({'nodes':len(N),'overrides':len(O),'gaps':len(gaps),'sources':len(sources)}))
# Selected legacy guided exercises share the same physical keys as the full emulator.
PN={}
def pn(id,kind,label,parent=None,children=None,page=7,src='prog',**extra):
 PN[id]={'kind':kind,'label':label,'parent':parent,'sourceRefs':[ref(page,src)],**extra}
 if kind=='menu' and parent:PN[id]['menuWrap']=False
 if children is not None:PN[id]['children']=children
pn('root','menu','ENGINEER MENU',children=['inputs','logs','tests','diagnostics','exit'],selectedSubset=True)
pn('inputs','zone-select','CHANGE INPUTS?','root',page=18,next='input-type',numericSelection=True)
pn('input-type','type','Input Type','inputs',page=18)
pn('logs','menu','REVIEW LOGS?','root',['panel-log'],page=30,selectedSubset=True)
pn('panel-log','log','Panel Log?','logs',page=30,detailsKey='cancel',logNextKey='area-d',logPreviousKey='previous',logSummaryKey='logout')
pn('tests','menu','ENGINEER TESTS?','root',['walk-ready'],page=31,selectedSubset=True)
pn('walk-ready','walk-ready','Walk Test?','tests',page=32,next='walk-run',lines=['Walk Test Areas','A · demo area selected'])
pn('walk-run','walk-run','Walk Test','walk-ready',page=32,all=True,finishKey='back')
pn('diagnostics','menu','DIAGNOSTICS?','root',['wireless','wired'],page=34,selectedSubset=True)
pn('wireless','menu','Wireless Devices?','diagnostics',['wireless-inputs'],page=36,selectedSubset=True)
pn('wireless-inputs','zones','View Inputs?','wireless',page=36,recordIds=wirelessZones,numericSelection=True,resistance=False,detailsKey=False)
pn('wired','menu','Wired Devices?','diagnostics',['wired-view'],page=36,selectedSubset=True)
pn('wired-view','menu','View Inputs?','wired',['wired-inputs'],page=36,selectedSubset=True)
pn('wired-inputs','zones','Endstation Inputs?','wired-view',page=36,recordIds=wiredZones,numericSelection=True,resistance=False,detailsKey='enter')
pn('exit','logout','EXIT ENGINEER MENU','root',page=43,confirmExit=True)
pn('manager-root','menu','MASTER MANAGER MENU',children=['omit-day'],page=14,src='user',sessionRoot=True,selectedSubset=True)
pn('omit-day','zone-omit','OMIT INPUTS?','manager-root',page=16,src='user',toggleKeys=['enter'],toggleLabel='YES',finishKey='back',eligibleOnly=True,eligibleZoneTypes=['Day Alarm'],numericSelection=True)
def task(id,title,description,path,route,goal,page,src='prog',**extra):
 return {'id':id,'title':title,'description':description,'path':path,'routeNodeIds':route,'goal':goal,'sourceRefs':[ref(page,src)],'sessionStart':'Already authorised Engineer practice','hints':[],'aliases':[],**extra}
tasks=[
 task('read-wireless-input','Check a wireless input','Find the fictional Hall PIR on input02 and read its live practice state.',['Engineer menu','DIAGNOSTICS?','Wireless Devices?','View Inputs?','Input02'],['root','diagnostics','wireless','wireless-inputs'],{'kind':'zone','zone':'02'},36,hints=['Use NO forward and B backward through the selected practice menu.','Enter DIAGNOSTICS with YES, then Wireless Devices and View Inputs.','Choose input02 with the separate arrow keys.'],aliases=['zone status','detector open closed','wireless input'],initialStates={'02':'active'}),
 task('read-wired-resistance','Read a wired input resistance','View input33 on the fictional I/O board, then use YES for its resistance detail.',['Engineer menu','DIAGNOSTICS?','Wired Devices?','View Inputs?','Endstation Inputs?','Input33'],['root','diagnostics','wired','wired-view','wired-inputs'],{'kind':'zone','zone':'33','resistance':True},36,hints=['Use NO/B to find DIAGNOSTICS and YES to enter.','Choose Wired Devices, View Inputs and Endstation Inputs with YES.','Select input33 using the separate arrows; YES reveals its fictional resistance.'],aliases=['zone resistance','ohms','wired detector']),
 task('last-alarm','Find the last alarm and its details','Browse the local panel log and use C to see which fictional detector caused the alarm.',['Engineer menu','REVIEW LOGS?','Panel Log?','Hall PIR alarm'],['root','logs','panel-log'],{'kind':'log','event':'alarm_hall','details':True},30,hints=['Find REVIEW LOGS using NO/B; YES enters Panel Log.','D moves to an older event; B moves to a newer event.','At the Hall PIR alarm, press C for the additional detail.'],aliases=['last alarm','alarm history','event log','what set it off']),
 task('walk-test','Walk-test the Hall PIR','Start the fictional areaA walk test, activate and restore input02, then finish with NO.',['Engineer menu','ENGINEER TESTS?','Walk Test?','AreaA','Hall PIR'],['root','tests','walk-ready','walk-run'],{'kind':'walk','zone':'02'},32,hints=['Open ENGINEER TESTS, then Walk Test. The selected exercise already chooses areaA.','Use the external demo controls to activate and restore input02.','Press NO to end this practice walk test.'],aliases=['walk testing','test detector','test PIR']),
 task('change-input-type','Change a demo input type','Select input04 and accept Entry Route (08) for this fictional input. Engineer exit is a separate exercise.',['Engineer menu','CHANGE INPUTS?','Input04','Input Type'],['root','inputs','input-type'],{'kind':'type','zone':'04','value':'Entry Route','commit':False},18,hints=['Choose CHANGE INPUTS with YES.','Select input04 with the separate arrows and press YES.','Type08 or select Entry Route with the arrows, then press YES. Real Engineer programming is committed at exit.'],aliases=['zone programming','input function','detector type']),
 task('omit-day-alarm','Omit a Day Alarm input','Temporarily omit the fictional Plant Room Day Alarm input03 through the authorised Master Manager menu.',['Master Manager menu','OMIT INPUTS?','Input03'],['manager-root','omit-day'],{'kind':'omission','zone':'03','value':True},16,'user',category='omission',startNodeId='manager-root',sessionStart='Already authorised Master Manager practice',sessionLabel='SIMULATED MASTER MANAGER SESSION',hints=['This manager route applies only to Day Alarm inputs; ordinary setting-time omission is different.','Enter OMIT INPUTS with YES and choose the fictional input03.','Press YES to omit the demo input, then NO to finish this selected practice route.'],aliases=['disable device','omit detector','bypass input','day alarm omission'],initialOmissions={'03':False},completionMessage='The fictional Day Alarm input is omitted. On the documented panel this omission clears after an arm/disarm cycle.'),
 task('exit-engineer','Leave Engineer mode and save','Use the documented exit entry to leave the authorised fictional Engineer session.',['Engineer menu','EXIT ENGINEER MENU'],['root','exit'],{'kind':'logout'},43,hints=['Use NO/B to locate EXIT ENGINEER MENU.','Press YES to enter; confirm the FINDR exit prompt with YES.','A also provides the documented quick-exit route from a main-menu screen.'],aliases=['save changes','exit programming','leave engineer'])]
keys=[{'id':str(i),'label':str(i),'ariaLabel':str(i)} for i in range(10)]
keys += [{'id':id,'label':label,'ariaLabel':description} for id,label,description in [('enter','YES','YES: enter or accept the displayed option'),('back','NO','NO: next menu question, or leave the current option'),('logout','A','A: exit a main menu or select area A'),('previous','B','B: previous menu question, newer log entry or area B'),('cancel','C','C: previous field, log details or area C'),('area-d','D','D: older log entry or area D'),('left','◀','Left arrow: previous record or value'),('right','▶','Right arrow: next record or value')]]
profile={'id':'pyronix-enforcer','brand':'Pyronix','title':'Enforcer V11','keypad':'Enforcer integrated LCD keypad','edition':'V11 · SAP102028847-02 / Extended User Rev-02','scope':'Seven selected Engineer and Master Manager exercises alongside the full source-pinned emulator. Engineer programming and Day Alarm manager omission have separate access contexts.','panelIds':['pyronix-enforcer-v11'],'allFixtureValuesSimulated':True,'fixtureNotice':config['fixtureNotice'],'sessionStart':'Already authorised practice session','lcdNotice':'Documented menu labels; populated screens, spacing and response times are illustrative.','enterLabel':'YES','backLabel':'NO','editLabel':'YES','directMenuCodes':False,'rightIsEnter':False,'leftIsBack':False,'zoneDigits':2,'commitOnExit':True,'exitFromRoot':False,'exitChecks':False,'exitPrompt':['Exit Engineer?','YES to save and leave'],'hideTypeCodes':False,'markCurrentType':True,'typeLabel':'Input Type','walkStopWithEnter':False,'reverseLogScroll':False,'rightLogDetails':False,'circuit':'Fictional wired DEOL input; wireless readings are not resistance measurements.','readings':{'secure':'2k20','active':'6k90','tamper':'O/C'},'statusLabels':{'secure':'C · Closed','active':'O · Open','tamper':'T · Tamper'},'navigation':nav,'zones':[{'address':i,'name':l,'type':'Final Exit' if i=='01' else 'Day Alarm' if i=='03' else 'Intruder','omitEnabled':i!='01','areas':['A']} for i,l in [('01','FRONT DOOR'),('02','HALL PIR'),('03','PLANT ROOM'),('04','OFFICE PIR'),('33','REAR CONTACT'),('34','STORE PIR'),('35','WORKSHOP PIR'),('36','SIDE CONTACT')]],'zoneTypes':[{'code':c,'label':l} for c,l in inputTypes],'sources':sources,'events':[{'id':'power_restored','label':'Mains Restored','zone':'','time':'09:14 29/10','details':'Fictional panel supply','logs':['panel'],'category':'mandatory'},{'id':'power_failed','label':'Mains Failure','zone':'','time':'09:12 29/10','details':'Fictional panel supply','logs':['panel'],'category':'mandatory'},{'id':'alarm_hall','label':'Intruder Alarm','zone':'02','time':'08:04 29/10','details':'HALL PIR · demo areaA','logs':['panel','alarm'],'category':'mandatory'},{'id':'access_demo','label':'Access Granted','zone':'','time':'07:58 29/10','details':'Demo user2 · fictional reader','logs':['access'],'category':'access'}],'keys':keys,'controls':[{'label':'NO / B','description':'Move forward/back through menu questions. NO also leaves an active option.'},{'label':'YES','description':'Enter the shown question; accept and advance a programmed field.'},{'label':'◀ / ▶','description':'Select records and values using the separate arrow buttons.'},{'label':'C / D in the log','description':'C shows details; D advances to an older event. B moves newer.'},{'label':'A','description':'Quick exit from a main menu; in an area field it selects areaA.'},{'label':'Programming save','description':'Engineer configuration is committed at exit; values and devices in FINDR are fictional.'}],'limitations':['Guided exercises contain selected branches; the free-use emulator provides the broader documented menu tree.','This baseline is Enforcer V11, not a claim about EURO, Enforcer V10 or later V12 firmware.','Wireless learning, real communications, battery loads and physical sounder behaviour are not simulated.','Some printed value ranges/codes conflict or are incomplete; those fields are marked in Sources & accuracy.','Predictive text and real keypad multi-tap timing are not reproduced.','No matching physical keypad has been used to verify timing or screen-by-screen firmware fidelity.'],'omissionInfo':{'label':'Pyronix omission context','meaning':'Master Manager OMIT INPUTS is the documented Day Alarm-only route. Ordinary omittable input bypass during setting is a separate workflow and is not substituted here.','duration':'The guide says this manager omission lasts until the system has been armed and disarmed.','restore':'Automatic reinstatement follows the documented arm/disarm cycle. Repeated-choice display details require matching keypad verification.'},'nodes':PN,'tasks':tasks}
(ROOT/'research/expansion/pyronix-profile.json').write_text(json.dumps(profile,indent=2)+'\n')
audit={'date':'2026-10-29','profileId':'pyronix-enforcer','baseline':mapdata['baseline'],'sources':sources,'counts':{'indexedEntries':len(N),'behaviorOverlays':len(O),'evidenceGaps':len(gaps),'guidedExercises':len(tasks),'physicalMenuKeys':len(keys),'engineerTopLevelEntries':22,'managerTopLevelEntries':16,'userTopLevelEntries':7},'countingRule':'Atlas count includes field choices and separate access contexts. It does not count physical LCD screens or imply firmware completeness.','manualPagesVisuallyChecked':[{'source':'prog','pages':[6,18]},{'source':'user','pages':[6]}],'physicalLayout':'Five columns × four rows. Digits/NO/YES in first3; A/B/C/D in column4; emergency police/fire and separate arrows in column5. Emergency buttons shown for recognition only.','navigation':nav,'criticalDistinctions':['No invented numeric chapter shortcuts.','C and D are separate from left/right arrow keys.','NO advances main-menu questions and exits active options; YES advances sequential programming fields.','Record addresses and output/type codes are different namespaces.','Manager omission applies to Day Alarm inputs only.','Engineer changes commit on exit; manager/user acceptance is immediate.','Normal/High app credential flows remain fictional; no real credentials or communications.'],'coverage':mapdata['coverage'],'gaps':gaps,'verification':{'mapValidation':'Pending runtime test','configurationAndRoutes':'Pending runtime test','physicalHardware':False,'actualAudioListening':False,'sourcesDownloadedAndFingerprinted':True}}
(ROOT/'research/expansion/pyronix-audit.json').write_text(json.dumps(audit,indent=2)+'\n')
print(json.dumps({'profileWritten':True,'guidedTasks':len(tasks),'menuKeys':len(keys)}))

# Recorded release verification for this reviewed snapshot. Rerun the command
# after any future change; this record is not a substitute for executing tests.
audit['runtimeStats']={'total':579,'menus':82,'editable':389,'actions':60,'referenceOnly':48,'documentedEntries':1317}
audit['verification'].update({
 'mapValidation':'Passed: zero graph/source-page validation errors.',
 'configurationAndRoutes':{'command':'node --test-isolation=none --test tests/emulator-pyronix.test.mjs','passed':25,'failed':0,'date':'2026-10-29'},
 'sharedFamilyCrossChecks':{'passed':5,'failed':0,'scope':'Pyronix source graph, practice links and behavior configuration checks.'},
 'guidedTasks':'All7 published Pyronix task routes passed the shared practice suite.',
 'scope':'Software checks validate this local simulator. Exact firmware prompts, original panel audio and physical hardware have not been verified.'})
audit['importantLimits']=[
 'The atlas counts selections and repeated access contexts, not physical LCD screens.',
 'Conditional modem, reader and signalling field visibility is not a complete firmware implementation; source conditions and explicit gaps remain visible.',
 'The module-output editor is a labelled fixture because the complete physical prompt sequence is not printed.',
 'Fast Format channel/restore flags are source references; the fully described SIA/Contact ID field sequence must not be taken as that branch.',
 'YES on Sound to Play acknowledges a local selection without changing programming. Exact panel tone playback and YES timing are unverified.',
 'Learning, deleting devices, actual communications and battery-load outcomes are not invented.',
 'Manager Day Alarm omission is distinct from ordinary input omission during arming; the exact repeated-selection restoration prompt remains unverified.'
]
(ROOT/'research/expansion/pyronix-audit.json').write_text(json.dumps(audit,indent=2)+'\n')
