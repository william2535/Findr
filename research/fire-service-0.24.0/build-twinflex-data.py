"""Transcribe the checked TWINFLEXpro² Rev18 menu reference; no cross-generation merge."""
from pathlib import Path
import json

root=Path(__file__).resolve().parents[2]
source='twinflex-pro2-engineer-18'
nodes=[]
def ref(page,section=''):
 return [{'sourceId':source,'pdfPage':page,'printedPage':str(page),**({'section':section} if section else {})}]
def add(id,title,parent=None,code=None,kind='menu',page=33,access='3A',**kw):
 n=dict(id=id,title=title,label=title,parentId=parent,code=None if code is None else str(code),kind=kind,access=access,sourceRefs=ref(page),simulationStatus='implemented',summary=title,order=len(nodes));n.update(kw)
 nodes.append(n);return n
def menu(id,title,parent,code,page=33,access='3A'): return add(id,title,parent,code,page=page,access=access)
def setting(id,title,parent,code,page,options=None,field=None,access='3A',**kw):
 return add(id,title,parent,code,kind='setting',page=page,access=access,options=options or [],field=field or id,requiresWrite=True,**kw)
def reference(id,title,parent,code,page,why,**kw):
 n=add(id,title,parent,code,kind='reference',page=page,summary=why,**kw);n['simulationStatus']='reference-only';return n

add('root','Engineer / operator menu',page=24,access='1',summary='Physical numeric selection + ENTER or UP/DOWN + ENTER. Access starts at Normal; four-digit code or key enables the documented level.')
menu('events','View Current Events','root',1,33,'1')
for code,id,title in [(1,'fires','Current Fires'),(2,'faults','Current Faults'),(3,'disables','Current Disables'),(4,'warnings','Current Warnings')]:
 add('events-'+id,title,'events',code,kind='status',page=36,access='1' if code<4 else '2A',viewType=id)
menu('tests','Test Modes','root',2,33,'2A')
menu('test-controls','Test Cntrl & Disply','tests',1,33,'2A')
for code,id,title,page in [(1,'lcd','Test LCD Display',36),(2,'leds','Test LEDs',36),(3,'buzzer','Test Buzzer',36),(4,'keyboard','Test Keyboard',37)]:
 add('test-'+id,title,'test-controls',code,kind='command',page=page,access='2A',command='test-'+id)
menu('test-zones','Test Zone','tests',2,33,'2B')
for code,id,title in [(1,'silent','Silent Test'),(2,'audible','Audible Test'),(3,'system','System Test')]:
 add('test-zone-'+id,title,'test-zones',code,kind='command',page=37,access='2B',command='zone-test',zoneSelect=True,testMode=id,options=['START','END'],summary='Select a zone (00 means all zones), then START or END. Approximately five-second reset is represented by an explicit training-time step.',notes=['The Rev18 System Test paragraph duplicates the local-audible description; this trainer does not infer an all-zone output pattern.'])
menu('activate-outputs','Activate Outputs','tests',3,33)
for code,id,title in [(1,'fire-relay','Fire Relay'),(2,'fault-relay','Fault Relay'),(3,'monitored-1','Monitored O/P 1'),(4,'monitored-2','Monitored O/P 2')]:
 reference('activate-'+id,title,'activate-outputs',code,38,'Documented output test. Electrical output/relay hardware and exact activation/reset behaviour are not simulated.',options=['OFF','ON'])
menu('test-inputs','Test Inputs','tests',4,33)
for code,id,title in [(1,'prog-1','Prog Input 1'),(2,'prog-2','Prog Input 2'),(3,'monitored','Monitored Input')]:
 reference('test-input-'+id,title,'test-inputs',code,38 if code<3 else 39,'Documented input test. No physical wiring or fitted input is inferred.')
menu('enable-disable','Enable / Disable','root',3,33,'2B')
for code,id,title,field in [(1,'remote','Remote Fires','remoteDisabled'),(2,'sounders','All Sounders','soundersDisabled'),(3,'resound','Re-Sound Alarm','resound'),(4,'zone','Zone','zoneDisabled')]:
 opts=['MANUAL','AUTO'] if id=='resound' else ['DISABLE','ENABLE']
 add('disable-'+id,title,'enable-disable',code,kind='setting' if id=='resound' else 'command',page=39,access='3A' if id=='resound' else '2B',command='operation',field=field,options=opts,zoneSelect=id=='zone',requiresWrite=id=='resound',summary=('Engineer-only re-sound setting. 3B stores MANUAL/AUTO; RESET applies it.' if id=='resound' else 'Choose and confirm this operator action. '+('All input devices in the selected zone are disabled; zone sounders can still operate from an alarm elsewhere. Individual addressed-device disablement is not provided.' if id=='zone' else 'This is separate from installer configuration and zone power status.')))
add('disable-delays','Delays','enable-disable',3,kind='command',page=31,access='2B',maxAccess='2B',command='operation',field='delaysDisabled',options=['DISABLE','ENABLE'],summary='Supervisor option 3 temporarily turns output delays off. Engineer option 3 is instead Re-Sound Alarm; these access-specific menus are kept distinct.')
reference('disable-peripheral','Peripheral Buss','enable-disable',5,40,'The source display repeats option number 2 for both OFF and ON. No verified numeric sequence or peripheral hardware is simulated.',access='2B',options=['OFF','ON'])
add('time-date','Set Time and Date','root',4,kind='setting',page=40,access='2B',editor='clock',summary='UP/DOWN selects date or time. Enter six digits DDMMYY or HHMMSS and ENTER to confirm. The practice clock is local; no BST correction is inferred.')
menu('logs','View Logs','root',5,34,'2B')
for code,id,title in [(1,'all','All Event Logs'),(2,'fire','Fire Logs'),(3,'fault','Fault Logs'),(4,'panel','Panel Event Logs')]:
 add('log-'+id,title,'logs',code,kind='status',page=40,access='2B',viewType='log',logType=id,summary='The source records up to 500 events. This trainer keeps its own labelled fictional event history.')
menu('zones','Zones','root',6,34)
setting('zone-power','Zone Status','zones',1,41,['ON','OFF'],zoneSelect=True,aliases=['replace device','add device','device work'],summary='For fictional device work, OFF switches off the selected zone supply. ENTER stores; RESET applies. No addressed device enrolment or individual device isolation is provided; check the actual device wiring manual.')
reference('zone-description','Zone Description','zones',2,41,'The physical alphanumeric cursor editing is documented, but exact multi-tap timing is not verified. Fictional labels are not written by a guessed keypad sequence.',zoneSelect=True)
setting('zone-mode','Zone Mode','zones',3,41,['CP/DET','CP/SM/HT'],summary='Original Multipoint versus ASD detection-mode indication. Configuration is simulated; detector compatibility and installation are not established.')
menu('confirmation','Alarm Confirmation','root',7,34)
setting('zone-type','Set Zone Type','confirmation',1,41,['COMMUNAL','DWELLING'],zoneSelect=True,summary='The selected zone is communal or dwelling for alarm confirmation. RESET applies changed configuration.')
setting('confirmation-type','Confirmation Type','confirmation',2,42,['SYSTEM','ZONAL'],summary='SYSTEM confirmation is overridden by an alarm on another zone; ZONAL retains each zone’s confirmation scope. See full source conditions.')
setting('confirmation-delay','Confirmation Delay','confirmation',3,42,[str(n) for n in range(1,6)],numericRange=[1,5],unit='minutes')
menu('delays','Alarm Delay','root',8,34)
for code,id,title in [(1,'zone-delay','Delay Zone o/ps'),(2,'fire-delay','Delay Fire Relay'),(3,'output1-delay','DLY monitored O/P 1'),(4,'output2-delay','DLY monitored O/P 2')]:
 setting(id,title,'delays',code,42 if code==1 else 43,['INSTANT','DELAYED'],zoneSelect=code==1)
setting('delay-time','Delay Time','delays',5,43,[str(n) for n in range(6)],numericRange=[0,5],unit='minutes',summary='0–5 minute alarm output delay. Zero disables delay. MCPs override; heat overrides only in CP/SM/HT mode (p56).')
setting('origin-delay','Zone of origin Delay','delays',6,44,['INSTANT','SETTING'],summary='INSTANT overrides a programmed output delay only on the initiating zone; other zones retain their configured setting.')
menu('panel-details','Panel Details','root',9,34)
menu('panel-buzzer','Buzzer','panel-details',1,34)
add('buzzer-enabled','ON / OFF','panel-buzzer',1,kind='command',page=44,command='operation',writeGuard=True,field='engineerBuzzer',options=['ON','OFF'],summary='3B permits this temporary engineer buzzer change. It applies immediately and is re-enabled on leaving Engineer; it is not a durable configuration setting.')
menu('access-codes','Access Code','panel-details',2,34)
for code,id,title in [(1,'user','User'),(2,'supervisor','Supervisor'),(3,'engineer','Engineer')]:
 add('code-'+id,title,'access-codes',code,kind='setting',page=44,requiresWrite=True,editor='code',codeRole=id,summary='UP/DOWN moves between existing, new and confirmed four-digit codes. ENTER validates and stores; RESET applies. These are practice codes saved only in this trainer.')
add('software','Software Version','panel-details',3,kind='status',page=45,viewType='software',summary='Read-only labelled V3.xx practice fixture. The manual’s V1.04 example is retained as a source illustration, not an installed firmware claim.')
menu('identification','PNL identification','panel-details',4,34)
reference('panel-number','Panel Number','identification',1,45,'The source explicitly states panel networking functions are not currently available. No network address or discovery behaviour is invented.')
reference('panel-description','Panel Description','identification',2,45,'Documented text editing; exact multi-tap timing is unverified. The source also states panel networking functions are not currently available.')
menu('timers','Timers','panel-details',5,34)
menu('weekly','Weekly Test Timer','timers',1,34)
setting('weekly-enabled','Weekly Test On / Off','weekly',1,45,['ON','OFF'],summary='Stores the documented reminder setting. A real calendar, weekly reminders and device response are not simulated.')
setting('weekly-day','Weekly Test Day','weekly',2,45,['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'],direction='vertical',summary='Stores the documented weekly reminder day; real-time calendar scheduling is outside this trainer.')
add('weekly-time','Weekly Test Time','weekly',3,kind='setting',page=46,editor='time',field='weekly-time',requiresWrite=True,summary='Enter HHMM using the numeric keypad, then ENTER stores and RESET applies. The reminder time is stored; a real calendar scheduler is not simulated.')
setting('service-timer','Service Timer','timers',2,46,[str(n).zfill(2) for n in range(100)],numericRange=[0,99],digits=2,unit='weeks',summary='Stores 0–99 weeks; 00 switches off the service reminder. Calendar expiry and actual maintenance status are not inferred.')
menu('io','Panel I/O','root',10,35)
input_types=['CONTROL EVENT','REMOTE FIRE EVENT','TECHNICAL EVENT','DISABLEMENTS','DAY-NIGHT MODE','OFF']
for code,prefix,title,page in [(1,'ip1','Programmable I/P 1',46),(2,'ip2','Programmable I/P 2',49),(3,'mon-input','Monitored I/P',51)]:
 menu(prefix,title,'io',code,35)
 n=reference(prefix+'-type','Input Type',prefix,1,page,'External input behaviour is reference-only. The source lists six input modes and nested definitions below; it does not establish any fitted device or live input.',options=input_types)
 for ncode,suffix,label,p,choices in [(1,'control','Control Event',page+1,['SILENCE ALARMS','RESET SYSTEM','SOUND ALARMS','SILENCE BUZZER']),(2,'remote','Remote Fire Event',page+1,['REMOTE FIRE FULL','REMOTE FIRE NO RELAYS']),(3,'technical','Technical Event',page+1,['LATCH','NON-LATCH']),(4,'disable','Disablement',page+2,['DISABLE SOUNDERS','DISABLE REM.FIRE','DIS SNDRS/REM FIRE','DISABLE BUZZER'])]:
  reference(prefix+'-'+suffix,label,prefix+'-type',ncode,(49 if suffix=='control' else 50) if prefix=='ip2' else min(p,53),'External circuit behaviour is not simulated.'+(' The source DISABLE BUZZER explanation repeats the remote-fire action; this conflict is retained.' if suffix=='disable' else ''),options=choices)
 reference(prefix+'-description','Description',prefix,2,48 if code==1 else 51 if code==2 else 53,'Documented alphanumeric text editing; exact multi-tap timing is not verified.')
for code,id,title,page in [(4,'output1','Monitored O/P 1',53),(5,'output2','Monitored O/P 2',54)]:
 menu(id,title,'io',code,35)
 setting(id+'-type','Output Type',id,1,page,['REMOTE SOUNDER','REMOTE FIRE','OFF'],direction='vertical',summary='Stores the documented output mode for review after RESET. Electrical circuit monitoring and fitted external output effects are not emulated.')
 reference(id+'-description','Description',id,2,page,'Documented text editing is reference-only.')
reference('fire-relay-description','Fire Relay','io',6,54,'Documented relay description editing is reference-only; a source label does not change its wiring.')
reference('fault-relay-description','Fault Relay','io',7,54,'Documented relay description editing is reference-only; a source label does not change its wiring.')
menu('peripheral','Peripheral Buss','root',11,35)
menu('rdu','PB RDU Supervise','peripheral',1,35)
for n in range(1,9): reference('rdu-'+str(n),'RDU '+str(n)+' Supervise','rdu',n,55,'Source supports up to eight peripheral devices, but the example repeats numeric choice 2 for Disable and Enable. No invented button sequence, remote device or network effects.',options=['Disable','Enable'])
menu('pb-config','PB Comm Configure','peripheral',2,35)
add('pb-baud','View PB Baud Rate','pb-config',1,kind='status',page=55,viewType='fixed',fixedValue='57,600 baud',summary='Source-fixed rate, not a measured or configurable value.')
add('pb-rate','View PB Mess Rate','pb-config',2,kind='status',page=55,viewType='fixed',fixedValue='1 second',summary='Source-fixed update interval, not a measured link-health indication.')
reference('printer','Printer','root',12,55,'The manual explicitly says printer functions are not currently in use.')
for code,id,title in [(1,'status','Printer Status'),(2,'all','All Event Log'),(3,'fire','Fire Events'),(4,'fault','Fault Events'),(5,'panel','Panel Events')]: reference('printer-'+id,title,'printer',code,35,'Printed in the overview; page55 states printer functions are not currently in use.')

data={
 'schemaVersion':1,'version':'0.24.0','id':'twinflex','profileId':'fike-twinflexpro2','title':'Fike TWINFLEXpro²','subtitle':'8-zone V3.xx source-based service trainer','modelScope':'TWINFLEXpro² 4/8-zone fascia, eight-zone fictional fixture; V3.00+ source baseline. Not original Twinflex, legacy pro, repeater or physical hardware certification.','panelIds':['fike-twinflexpro2'],
 'sources':[
  dict(id=source,title='TWINFLEXpro² Control Panel Engineering and Commissioning Manual',edition='Doc. 26-0959 Rev.18 · October 2020 · V3.00+',publisher='Fike Safety Technology',recordId='fike-6cfbefcbbb78',url='https://my.fike.com/_fike_docs/New_Docs_System/Fire%20Protection/Fire%20Detection%20&%20Control/TwinflexPro/Conventional%20Control%20Panels/Manuals/TWINFLEXpro%20Panel%20Eng&ComManual%2026-0959-18.pdf',sha256='19a3a00c9300574c53573cbdda4eb98fa240e6a7c633bbd5003fec9b439ef5cd',totalPdfPages=80,pages=80,scope='Current pro² baseline, not the older pro Issue7. Extracted cover text contains a retained Issue14 Draft template artifact that is not visible in the rendered cover.'),
  dict(id='twinflex-pro2-user-5',title='TWINFLEXpro² Control Panel User Guide',edition='Doc.26-1028 Rev.5 · V3.00+',publisher='Fike Safety Technology',recordId='facp-9e607562-03e2-429b-bcc3-b8f7dab17b75',url='https://docs.facpmanuals.com/manuals/Fike/twinflex_pro2-user-guide-rev5.pdf',sha256='f9142c9807f388c9e4ce65507d8ceb906a4ff609a3c9e98f6181ee981373aaf3',totalPdfPages=32,pages=32,scope='Operator access, physical controls and restoration; exact installed codes and firmware still need verification.')
 ],
 'physicalKeys':[{'id':k,'label':label} for k,label in [(str(n),str(n)) for n in range(10)]+[('UP','↑'),('DOWN','↓'),('LEFT','←'),('RIGHT','→'),('ENTER','Enter'),('ESC','* Esc'),('HASH','#'),('SILENCE_ALARMS','Silence Alarms'),('RESET','Reset System'),('SOUND_ALARMS','Sound Alarms'),('SILENCE_BUZZER','Silence Buzzer'),('ENABLE_KEY','Enable Controls key'),('WRITE_ENABLE','Write Enable')]],
 'fixture':{'label':'Fictional FINDR site; no live panel connection','zoneNames':['Reception','Ground corridor','First floor','Office east','Office west','Plant room','Stores','Stairwell'],'codes':{'user':'8737','supervisor':'7877','engineer':'3647'},'clock':'02/11/26 09:00','software':'V3.xx PRACTICE'},
 'scenarios':[{'id':'normal','title':'Normal panel'},{'id':'zone-fault','title':'Zone 1 EOL missing'},{'id':'fire','title':'Zone 1 smoke alarm'},{'id':'disabled-zone','title':'Zone 1 input disabled'}],
 'nodes':nodes,'lessons':[],
 'knownLimits':['All events, zone labels, device-work acknowledgements and timings are fictional training data.','Zone disablement ignores all inputs in that zone; Zone Status OFF is a separate installer supply-off setting. There is no addressed-device enrolment menu.','Level3A permits engineer review; programming changes require the exposed Write Enable switch at3B and a system reset to take effect. Operator disable/test actions are separate.','Exact alphanumeric multi-tap timing, external input electrical effects, peripheral supervision, unavailable panel networking and printer functionality remain reference-only.','Source System Test description duplicates local audible test; no all-zone sound pattern is inferred. Peripheral ON/OFF examples repeat option numbers; no guessed numeric sequence is supplied.','The training clock advances only through labelled assists. Approximately five-second walk-test reset is a source approximation, not measured firmware timing.','Display contents and post-reset view continuity are illustrative; source menus, physical keys, choices and access boundaries are retained.']}
def keys(title, sequence, page, expected):
 return dict(title=title,expectedKeys=sequence if isinstance(sequence,list) else list(sequence),sourceRefs=ref(page),expected=expected)
def action(title, value, page, expected):return dict(title=title,action=value,sourceRefs=ref(page),expected=expected)
def login(engineer=False):return keys('Enter the four-digit practice '+('Engineer' if engineer else 'Supervisor')+' code','3647' if engineer else '7877',24,'Accepted on the fourth digit; no ENTER needed. Access '+('3A' if engineer else '2B')+'.')
def write_on():return [action('Remove the right-hand cover',{'type':'cover','open':True},24,'Removing the cover alone leaves access at 3A.'),keys('Switch Write Enable ON',['WRITE_ENABLE'],24,'Engineer access 3B; programming may now be confirmed.')]
def key_route(*items):
 out=[]
 for item in items:out+=list(str(item))+['ENTER']
 return out
def finish():return [keys('Switch Write Enable OFF',['WRITE_ENABLE'],24,'Access 3A; confirmed settings remain stored.'),action('Refit the right-hand cover',{'type':'cover','open':False},24,'Cover refitted; switch remains OFF.')]
def lesson(id,title,steps,pages,scenario='normal'):
 for i,s in enumerate(steps):s['id']=id+'-'+str(i+1)
 return dict(id=id,title=title,scenarioId=scenario,steps=steps,sourceRefs=[ref(p)[0] for p in pages],summary=steps[-1]['expected'])
data['lessons']=[
 lesson('engineer-access','Enter installer level 3 and protect programming',[login(True),*write_on(),*finish(),keys('Return to Normal',['ESC'],24,'Normal access; Write Enable OFF; no System Fault reminder.')],[24]),
 lesson('disable-zone','Disable and restore a whole zone',[login(),keys('Select Zone 1 input disablement',key_route(3,4,'01'),39,'Zone 1 selected. This affects all inputs in this zone; it is not individual-device disablement.'),keys('Disable the inputs',['LEFT','ENTER'],39,'Zone 1 input disabled immediately. The zone supply remains ON.'),action('Apply a fictional MCP on Zone 1',{'type':'input','zone':1,'kind':'alarm','value':'mcp'},39,'The disabled input causes no alarm event or action.'),action('Clear the fictional MCP',{'type':'input','zone':1,'kind':'alarm','value':False},39,'Clear the input before restoring the zone.'),keys('Restore Zone 1 inputs',['RIGHT','ENTER'],39,'Zone 1 enabled; no disablement remains.')],[24,39]),
 lesson('zone-power','Isolate zone supply for fictional device work',[login(True),*write_on(),keys('Select Zone 1 status',key_route(6,1,'01'),41,'Applied zone supply is ON. This differs from input disablement.'),keys('Store Zone OFF',['RIGHT','ENTER'],41,'OFF stored, but active supply remains ON until a system reset.'),keys('Apply the stored status',['RESET'],33,'Zone 1 supply is now OFF in this simulation.'),action('Acknowledge fictional device work',{'type':'acknowledge'},41,'No address enrolment occurs. The source is a zone system; follow the actual device wiring and compatibility manual onsite.'),keys('Store and apply Zone ON',['LEFT','ENTER','RESET'],41,'Zone 1 supply restored; no pending configuration.'),*finish()],[24,33,41]),
 lesson('silent-walk-test','Silent one-person zone walk test',[login(),keys('Choose Zone 1 Silent Test',key_route(2,2,1,'01'),37,'START selected for Zone 1.'),keys('Start Silent Test',['ENTER'],37,'Test LED and Zone 1 test status active.'),action('Trigger the fictional Zone 1 detector',{'type':'input','zone':1,'kind':'alarm','value':'smoke'},37,'Panel indicates alarm; zone sounders remain silent.'),action('Advance five simulated seconds',{'type':'tick','seconds':5},37,'Device resets after approximately five seconds; test mode stays active.'),keys('End Zone 1 test',['RIGHT','ENTER'],37,'Test mode ends; protection is restored.')],[24,37]),
 lesson('fault-log','Investigate an EOL fault and retain the event log',[login(),keys('Read Current Faults',key_route(1,2),36,'Zone 1 EOL missing; the label does not locate a physical cable break.'),action('Clear the fictional EOL fault after checking it',{'type':'input','zone':1,'kind':'fault','value':False},36,'The active fault clears; the previous event remains in the log.'),keys('Open the Fault Log',['ESC','ESC',*key_route(5,3)],40,'Stored fault history remains available after the active input is cleared.')],[24,36,40],'zone-fault'),
 lesson('output-delay','Program and verify a zone output delay',[login(True),*write_on(),keys('Set Zone 1 outputs to DELAYED',[*key_route(8,1,'01'),'RIGHT','ENTER'],42,'Stored selection; not applied yet.'),keys('Set a one-minute delay',['ESC',*key_route(5),'1','ENTER'],43,'One minute stored; reset still required.'),keys('Allow delay at the zone of origin',['ESC',*key_route(6),'RIGHT','ENTER','RESET'],44,'SETTING applied. The source default INSTANT would otherwise override delay on the initiating zone.'),action('Apply a fictional smoke alarm',{'type':'input','zone':1,'kind':'alarm','value':'smoke'},56,'Zone 1 fire is indicated; its programmed sounders wait for the delay.'),action('Advance one simulated minute',{'type':'tick','seconds':60},56,'Zone 1 delayed sounders now operate.'),keys('Silence alarms',['SILENCE_ALARMS'],24,'Alarm outputs silenced; fire indication remains.'),action('Clear the fictional detector input',{'type':'input','zone':1,'kind':'alarm','value':False},56,'Clear input before reset.'),keys('Reset the indication',['RESET'],33,'No active fire remains. Programmed delay is retained for this fictional exercise.'),*finish()],[24,33,42,43,44,56]),
 lesson('alarm-controls','Silence, investigate and reset an alarm',[login(),keys('Silence the alarms',['SILENCE_ALARMS'],24,'Sounders stop; buzzer and fire indication remain.'),keys('Silence the internal buzzer',['SILENCE_BUZZER'],24,'Buzzer silenced separately.'),keys('Try reset while the input remains',['RESET'],24,'The active fictional detector reasserts; reset cannot clear a persistent input.'),keys('Silence again',['SILENCE_ALARMS'],24,'Sounders silenced.'),action('Clear the fictional detector after investigating',{'type':'input','zone':1,'kind':'alarm','value':False},24,'Input removed; latched indication remains until reset.'),keys('Reset the panel',['RESET'],24,'Fire indication clears; the event history remains.')],[24],'fire'),
 lesson('practice-code','Change a practice user code with confirmation',[login(True),*write_on(),keys('Open User access-code editing',key_route(9,2,1),44,'Existing fixture code is displayed. UP/DOWN changes fields.'),keys('Enter NEW and matching CONFIRM',['DOWN',*'1234','DOWN',*'1234','ENTER'],44,'New practice code stored; active code remains 8737 until reset.'),keys('Apply the stored code',['RESET'],33,'Active practice user code is now 1234; no real credentials changed.'),*finish(),keys('Exit and verify the new User code',['ESC','ESC','ESC','ESC',*'1234'],44,'User access 2A accepted using the new practice code.')],[24,33,44]),
 lesson('date-time','Set the practice date and time',[login(),keys('Open Set Time and Date',key_route(4),40,'Date field selected. UP/DOWN chooses date or time.'),keys('Enter a valid date and time',[*'031126','DOWN',*'103000','ENTER'],40,'Practice clock is 03/11/26 10:30:00. No automatic BST correction is claimed.')],[24,40])
]
for n in nodes:
 if n['simulationStatus']=='implemented':n['hintsRoute']='#twinflex/guided/'+n['id']
(root/'public/app/data/twinflex.json').write_text(json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n')
print(len(nodes),'source-backed nodes')
