"""Source-scoped XFP trainer data. Existing archive records remain unchanged."""
import json, hashlib
from pathlib import Path
root=Path(__file__).resolve().parents[2]
def source(id,record,title,edition,pages):
 p=Path('/tmp/fire-service-0.24.0')/(record+'.pdf')
 return dict(id=id,recordId=record,title=title,edition=edition,publisher='C-TEC',url={'xfp32':'https://c-tec.com/download?wpdmdl=12095','xfp16':'https://c-tec.com/download?wpdmdl=12092','xfp-user':'https://www.srsalertfire.ie/uploads/WsOIx2U5/XFPUserManual.pdf'}[id],totalPdfPages=pages,sha256={'xfp32':'a56ad3e3160fa617e4d024dba54bc0e378f5542855be71ee3a35b90083b1faea','xfp16':'dd2afe39b0a4b2fcb2ad6c83559edc812ab0d43b8db8e3f23423a13e8eed556d','xfp-user':'1710cb3359701fc524a96ed38fc165502b62d4737c0d94d1175ef0466773bc14'}[id])
sources=[source('xfp32','c-tec-b03be75d8eb7','XFP 1 or 2 Loop 32 Zone Engineering Manual','DFU2200510 Rev 2',36),source('xfp16','c-tec-6a8ae5ddd7bc','XFP Single Loop 16 Zone Engineering Manual','DFU1200510 Rev 3',36),source('xfp-user','c-tec-70f490a601e3','XFP User Manual and Log Book','DFU2000501 Rev 2',28)]
nodes=[]
def add(id,label,kind='menu',parent='root3',level=3,p=17,p16=None,**kw):
 refs=[dict(sourceId='xfp32',pdfPage=p,printedPage=str(p)),dict(sourceId='xfp16',pdfPage=p16 or p,printedPage=str(p16 or p))]
 n=dict(id=id,label=label,title=label,kind=kind,parentId=parent,minLevel=level,sourceRefs=refs,simulationStatus='implemented',summary=kw.pop('summary',label.title()+' in the fictional XFP fixture.'),**kw)
 if kind=='reference':n['simulationStatus']='reference-only'
 if kind not in ['reference','root']:n['hintsRoute']='#xfp/guided/'+id
 nodes.append(n);return n
add('root1','General user — access level 1','root',None,1)
add('root2','Authorised user — access level 2','root',None,2)
add('root3','Engineer — access level 3','root',None,3)
add('access2','ENTER ACCESS LEVEL 2','access','root1',1,p=18,accessTarget=2,summary='Code-entry models use the documented four-digit code. The separate keyswitch grants level 2 only.')
add('access3','ENTER ACCESS LEVEL 3','access','root1',1,p=18,accessTarget=3,summary='Menu → Enter Access Level 3 → Accept, then four digits using the arrow keys. The fictional default is 4444; this is not evidence of a live panel code.')
for id,label,condition in [('fire-events','DISPLAY FIRE EVENTS','fire'),('fault-events','DISPLAY FAULT EVENTS','fault'),('disabled-events','DISPLAY DISABLEMENTS','disabled'),('test-events','DISPLAY ZONES IN TEST','test')]:
 add(id,label,'display','root1',1,p=19,condition=condition)
add('lamps','LAMPS TEST','lamps','root1',1,p=17,summary='Tests the fictional indicators and LCD; this does not certify a physical lamp or sounder.')
add('alarm-counter','DISPLAY ALARM COUNTER','display','root1',1,p=17)
add('time-date','SET TIME/DATE','time','root2',2,p=17,fields=['hour','minute','day','month','year'],summary='Changes the fictional clock only.')
add('event-log','EVENT LOG FUNCTIONS','menu','root2',2,p=17)
add('history','DISPLAY EVENT HISTORY','display','event-log',2,p=17)
add('print-history','PRINT EVENT HISTORY','reference','event-log',2,p=17,variants=['32'],summary='Printer hardware and print timing are not simulated. This option is unavailable on the 16-zone panel.')
add('reset-history','RESET EVENT HISTORY','confirm','event-log',2,p=17,summary='Confirmed reset affects this fictional trainer history only.')
add('passwords','SETUP PASSWORDS',p=19)
add('code2','CHANGE ACCESS LEVEL 2 CODE','code','passwords',2,p=19,requiresNvm=False,codeLevel=2)
add('code3','CHANGE ACCESS LEVEL 3 CODE','code','passwords',3,p=19,requiresNvm=True,codeLevel=3)
add('pc','CONNECT TO PC','reference',p=20,summary='XFP507 PC tools are required for cause and effect, zone/device names, dependency and output-set assignment. FINDR does not emulate a PC connection or upload/download.')
add('network','NETWORK FUNCTIONS',p=20,condition='network',summary='Requires the optional network communication card. Rev 3 explicitly describes a non-redundant network not assessed to EN54-2. The training fixture can explicitly fit or remove the card.')
add('comms-mode','SET COMMS FUNCTION','toggle','network',p=20,requiresNvm=True,setting='commsMode',choices=['Repeater','Network'])
add('panel-number','SET PANEL NUMBER','setting','network',p=20,requiresNvm=True,setting='panelNumber',minimum=1,maximum=8)
add('panel-fitted','SET PANEL FITTED','reference','network',p=20,summary='Source records temporary integrity-monitoring suppression. The exact multi-panel hardware and fitting selector are not simulated.')
add('commissioning','COMMISSIONING FUNCTIONS',p=21)
add('loop-learn','LOOP LEARN','loop-learn','commissioning',p=21,requiresNvm=True,summary='Two distinct source paths: preserve existing assignments/text, or explicitly confirm erasing the fictional loop database before relearning. Addresses are not physical cable order.')
add('find-new','FIND NEW DEVICES','find-new','commissioning',p=22,requiresNvm=True,summary='Searches the explicit fictional connected-device fixture. Accept or reject each new device, then assign an input zone or sounder group. I/O output-set programming remains PC-only.')
add('fitted','SHOW FITTED DEVICES','fitted','commissioning',p=22,summary='Shows the stored learned database, including missing/faulty devices. It cannot establish what is physically installed now.')
add('assign','ASSIGN ZONE/GROUP','assign','commissioning',p=23,requiresNvm=True,summary='Basic input-zone or sounder-group assignment. I/O output sets, labels and cause/effect remain PC-only.')
for id,label,p in [('calibrate','CALIBRATE DEVICES',23),('commission-loop','COMMISSION THE LOOP(S)',23),('calibration-problems','SHOW CALIBRATION PROBLEMS',23),('duplicate-addresses','SHOW DUPLICATE ADDRESSES',24)]:
 add(id,label,'reference','commissioning',p=p,summary='Documented hardware/calibration diagnostic. FINDR preserves the source procedure without inventing a successful measurement or activating device outputs.')
add('day-night','SET DAY/NIGHT TIMES','time','commissioning',p=24,requiresNvm=True,fields=['dayHour','dayMinute','nightHour','nightMinute'],summary='Edits fictional occupied/unoccupied times. Sensitivity and cause/effect changes themselves require PC programming and are not inferred.')
add('dst','ENABLE/DISABLE DST ADJUSTMENT','toggle','commissioning',p=25,requiresNvm=True,setting='dst',choices=['Enabled','Disabled'])
add('sounder-mode','CONFIGURE SOUNDER DISABLEMENTS','toggle','commissioning',p=25,requiresNvm=True,setting='sounderMode',choices=['Globally','Individually'])
add('clean-start','MAKE A CLEAN START','clean-start','commissioning',p=25,requiresNvm=True,summary='The documented five-button confirmation clears only this fictional variant’s configuration. Other FINDR sessions, PDFs and trainer variants are untouched.')
add('engineer','ENGINEER FUNCTIONS',p=25)
add('disablements','SET/CLEAR DISABLEMENTS','menu','engineer',2,p=25)
for id,label,target,p,p16 in [('disable-zones','ENABLE/DISABLE ZONES','zones',25,25),('disable-sounders','ENABLE/DISABLE SOUNDERS','sounders',25,25),('disable-outputs','ENABLE/DISABLE OUTPUTS','outputs',26,26),('disable-relays','ENABLE/DISABLE RELAYS','relays',26,26)]:
 add(id,label,'disable','disablements',2,p=p,p16=p16,target=target)
add('disable-devices','ENABLE/DISABLE DEVICES','device-disable','disablements',2,p=26,summary='Select a zone, then the actual loop/address device. Disabling every input on a zone also disables the zone; re-enable a device before trying to enable that zone.')
add('disable-fault','ENABLE/DISABLE FAULT RELAY','toggle','disablements',2,p=27,p16=26,setting='faultRelay',choices=['Enabled','Disabled'])
add('disable-delays','ENABLE/DISABLE OUTPUT DELAYS','toggle','disablements',2,p=27,setting='outputDelays',choices=['Enabled','Disabled'])
add('monitor','MONITOR A POINT','point','engineer',p=27,summary='The monitored point is temporarily disabled. The trainer uses explicitly fictional analogue readings; leaving the view restores the prior disablement state.')
add('test-device','TEST DEVICE OUTPUTS','test-device','engineer',p=27,summary='Output bits 0–7 represent channels 1/2/3. After acceptance, changes are live in the fictional fixture; Escape restores normal outputs. Real I/O channels may operate critical equipment.')
add('test-outputs','TEST OUTPUT SETS','test','engineer',p=28,target='outputs',states=['Normal','Triggered'])
add('test-sounders','TEST SOUNDER GROUPS','test','engineer',p=28,target='sounders',states=['Silenced','Intermittent','Continuous'])
add('test-relays','TEST PANEL RELAYS','test','engineer',p=29,p16=28,target='relays',states=['Normal','Triggered'],summary='Three panel relays only. A copied paragraph in the manual mentions 1–16 output sets; the relay specification and actual relay screen limit this selector to relays 1–3.')
add('walk-test','WALK TEST','walk','engineer',p=29,summary='Select a zone, then Normal operation or Walk Test mode and Accept. Test alarms pulse mapped sounders; output sets do not activate. Return to access level 1 to view tested devices.')
add('blink','BLINK DETECTOR LEDS','blink','engineer',p=29,summary='Choose loop and End A/End B/Both Ends. The trainer records the selected test without claiming physical cable order or a break location.')
add('intensive','INTENSIVE DEVICE MONITOR','reference','engineer',p=30,summary='This real function suspends all other activity, including fire reporting. Hardware polling and any connected I/O outputs are not simulated; no healthy result is invented.')
add('loop-test','LOOP TEST','reference','engineer',p=31,summary='This real function suspends other system activity while polling. Read the source; physical communication results and failure location cannot be established by this trainer.')
add('database','DISPLAY DATABASE','point','engineer',p=32,summary='Stored loop/address/type/location information from the fictional programmed database, not a live survey.')
add('versions','VERSION NUMBERS','display','engineer',p=32,summary='Displays a labelled synthetic software/site-data example. Matching checksum examples do not verify real firmware or hardware.')
add('psu','SHOW PSU STATS','display','engineer',p=33,p16=32,summary='Read-only synthetic PSU values, explicitly labelled as fictional. These are not expected-value thresholds for live testing.')
add('earth','ENABLE/DISABLE EARTH FAULT','toggle','engineer',p=33,requiresNvm=True,setting='earthMonitoring',choices=['Enabled','Disabled'])
add('current','SHOW LOOP CURRENT','display','engineer',p=33,summary='Read-only synthetic loop-current example. The single-loop variant never displays a second loop despite a copied two-loop illustration in its manual.')
add('discovery','SHOW DISCOVERY EEPROM','reference','engineer',p=33,summary='Applies to Apollo Discovery devices only. This XP95 fixture has no Discovery device; raw EEPROM values and their meanings are not invented.')
add('network-events','SHOW NETWORKED EVENTS','reference','engineer',p=33,summary='The documented bit-field depends on an actual network and configuration. No networked events are inferred in the standalone fixture.')
by={n['id']:n for n in nodes}
for n in nodes:
 if n['kind'] in ['root','menu']:n['children']=[v['id'] for v in nodes if v['parentId']==n['id']]
common=['fire-events','fault-events','disabled-events','test-events','lamps','alarm-counter']
by['root1']['children']=['access2','fire-events','fault-events','disabled-events','test-events','access3','lamps','alarm-counter']
by['root2']['children']=['access3']+common+['time-date','event-log','disablements','code2']
by['event-log']['children']=['print-history','history','reset-history']
by['root3']['children']=['fire-events','fault-events','disabled-events','passwords','pc','network','commissioning','engineer']
keys=[('UP','Scroll up / 1'),('ACCEPT','Accept / 2'),('DOWN','Scroll down / 3'),('ESCAPE','Escape / 4'),('MENU','Menu'),('MORE','More information'),('SILENCE_INTERNAL','Silence internal sounder'),('SILENCE_RESOUND','Silence / resound sounders'),('RESET','Control panel reset'),('INVESTIGATE','Investigate'),('KEY_SWITCH','Enable controls keyswitch')]
data=dict(schemaVersion=1,id='xfp',version='0.24.0',title='C-TEC XFP',modelScope='Apollo XP95 fictional fixtures: XFP502/X 32-zone two-loop metal cabinet and XFP501E/X 16-zone single-loop plastic cabinet. These checked manuals also cover named Hochiki variants, but this trainer does not mix protocols or emulate CAST.',sources=sources,variants=[dict(id='32',panelId='c-tec-xfp-32-zone',title='XFP 32 zone · metal',part='XFP502/X',zoneCount=32,loopCount=2,sourceId='xfp32',keySwitch=True),dict(id='16',panelId='c-tec-xfp-16-zone',title='XFP 16 zone · plastic',part='XFP501E/X',zoneCount=16,loopCount=1,sourceId='xfp16',keySwitch=True)],physicalKeys=[dict(id=k,label=l) for k,l in keys],nodes=nodes,fixture=dict(site='FINDR PRACTICE SITE',protocol='Apollo XP95',notice='All devices, names, readings, events and configuration values are fictional. Addresses do not describe physical cable order.',devices=[dict(id='1:1',loop=1,address=1,type='Optical detector',input=True,zone=1,location='Training reception detector'),dict(id='1:2',loop=1,address=2,type='Manual call point',input=True,zone=1,location='Training reception exit'),dict(id='1:3',loop=1,address=3,type='Sounder',input=False,group=1,location='Training reception sounder'),dict(id='2:1',loop=2,address=1,type='Optical detector',input=True,zone=2,location='Training upper landing')],newDevice=dict(id='1:4',loop=1,address=4,type='Optical detector',input=True,zone=1,location='New fictional detector')),knownLimits=['Source manuals establish documented controls, not hardware-certified firmware timing. Page 19 describes zones-in-test at level 3 and page 18 mentions level-2 functions, but their positions are absent from the page-17 level-3 tree. The trainer preserves that tree and accesses those functions through the documented level-2 tree instead of inventing their level-3 positions.','Cause/effect, zone/device labels, dependency settings and I/O output-set assignment require XFP507 PC programming; no panel-only substitute is invented.','Calibration, intensive monitor, loop-poll results, EEPROM, network events and printer hardware remain source references.','NVM unlock and access level 3 are separate. Relock memory before leaving installer access.','The selected cabinet has its own saved configuration and capacity bounds. CAST, Hochiki and repeaters are not silently substituted.','Fictional sounder mapping is one-out/all-out to group 1; it is not a real installation cause/effect matrix.'],scenarios=[dict(id='normal',title='Normal fictional site'),dict(id='fire',title='Detector fire at reception'),dict(id='missing',title='Missing reception detector'),dict(id='new-device',title='One unlearnt detector connected'),dict(id='earth',title='Earth fault')],lessons=[])
def lesson(id,title,summary,steps,scenario='normal'):
 data['lessons'].append(dict(id=id,title=title,summary=summary,scenarioId=scenario,sourceRefs=[dict(sourceId='xfp32',pdfPage=18,printedPage='18')],steps=steps))
def step(title,**kw):return dict(title=title,**kw)
def route(id):return step('Navigate to '+by[id]['label'],routeNode=id,explanation='Follow the highlighted physical keys. The route stops before you change a setting.',sourceRefs=by[id]['sourceRefs'])
def key(k,title):return step(title,expectedKeys=[k],sourceRefs=[dict(sourceId='xfp32',pdfPage=18,printedPage='18')])
def action(type,title,**kw):return step(title,expectedInput=dict(type=type,**kw),explanation='Use the labelled fictional practice action; this is separate from a panel key.',sourceRefs=[dict(sourceId='xfp32',pdfPage=18,printedPage='18')])
lesson('installer-access','Enter installer access and unlock memory','Use the level-3 code, then open the training cover and fit the NVM link.',[route('commissioning'),action('cover','Open the training cover',open=True),action('nvm','Fit the NVM memory-unlock link',enabled=True)])
lesson('disable-device','Disable and restore one detector','Use its zone and loop/address identity, then restore the same device.',[route('disable-devices'),key('ACCEPT','Select zone 1'),key('ACCEPT','Select the first detector'),key('DOWN','Choose Disabled'),key('ACCEPT','Confirm detector disablement'),key('UP','Return to the first detector'),key('ACCEPT','Select the same detector'),key('DOWN','Choose Enabled'),key('ACCEPT','Confirm restoration')])
lesson('walk-test','Put a zone into walk test and restore it','Test a fictional device, then restore normal zone operation.',[route('walk-test'),key('ACCEPT','Select zone 1'),key('DOWN','Choose Walk test mode'),key('ACCEPT','Confirm zone test'),action('test-trigger','Trigger the fictional zone-1 test point'),route('walk-test'),key('ACCEPT','Select zone 1 again'),key('DOWN','Choose Normal operation'),key('ACCEPT','Confirm restoration')])
lesson('find-new-device','Accept a newly connected detector','Find the explicit fictional new detector and assign its input zone; PC programming remains separate.',[action('cover','Open the training cover',open=True),action('nvm','Fit the NVM memory-unlock link',enabled=True),route('find-new'),key('ACCEPT','Confirm the search'),key('ACCEPT','Search loop 1'),key('ACCEPT','Accept the displayed new detector'),key('ACCEPT','Assign it to zone 1')],scenario='new-device')
lesson('assign-device','Assign a detector to zone 2','Make a basic input-zone assignment in the fictional database.',[action('cover','Open the training cover',open=True),action('nvm','Fit the NVM memory-unlock link',enabled=True),route('assign'),key('ACCEPT','Select loop 1'),key('ACCEPT','Select device 1'),key('DOWN','Choose zone 2'),key('ACCEPT','Confirm the assignment')])
lesson('monitor-point','Monitor a point and leave the diagnostic','Observe a labelled synthetic reading and restore the temporary disablement on exit.',[route('monitor'),key('ACCEPT','Select loop 1'),key('ACCEPT','Select device 1'),key('ESCAPE','Leave the monitor and restore its prior state')])
lesson('test-sounder','Test a sounder group and return it to silence','Advance the fictional group through its documented states, then stop the test.',[route('test-sounders'),key('ACCEPT','Select all sounder groups'),key('ACCEPT','Select Intermittent'),key('ACCEPT','Select Continuous'),key('ACCEPT','Return to Silenced'),key('ESCAPE','Leave the test')])
lesson('fault-details','Read a device fault and mute the buzzer','Use More information on the fictional missing-device fault.',[key('MORE','View the device fault details'),key('SILENCE_INTERNAL','Silence the internal sounder')],scenario='missing')
lesson('fire-reset','Silence and reset a cleared fire input','Reset requires silenced sounders; the fictional input must also be restored.',[key('KEY_SWITCH','Turn the Enable controls key'),key('SILENCE_RESOUND','Silence the alarm sounders'),action('clear-inputs','Clear the fictional detector input'),key('RESET','Reset the panel after investigation')],scenario='fire')
lesson('leave-installer','Relock memory and leave installer access','Keep access, cover and NVM state distinct.',[route('commissioning'),action('cover','Open the training cover',open=True),action('nvm','Remove the NVM link',enabled=False),action('hold-escape','Hold Escape to leave access'),action('cover','Refit the training cover',open=False)])
for item in data['lessons']:
 current=None; collected=[]
 for st in item['steps']:
  if st.get('routeNode'):current=st['routeNode']
  if st.get('expectedKeys') and current:st['sourceRefs']=by[current]['sourceRefs']
  if any(k in ['MORE','SILENCE_INTERNAL','SILENCE_RESOUND','RESET','KEY_SWITCH'] for k in st.get('expectedKeys',[])):st['sourceRefs']=[dict(sourceId='xfp-user',pdfPage=7,printedPage='7')]
  if st.get('expectedInput',{}).get('type')=='test-trigger':st['sourceRefs']=by['walk-test']['sourceRefs']
  if st.get('expectedInput',{}).get('type')=='clear-inputs':st['sourceRefs']=[dict(sourceId='xfp-user',pdfPage=9,printedPage='9')]
  for ref in st['sourceRefs']:
   if ref not in collected:collected.append(ref)
 item['sourceRefs']=collected
data['lessons'][3]['aliases']=['add device','add detector','find new device']
by['lamps']['sourceRefs'].append(dict(sourceId='xfp-user',pdfPage=15,printedPage='15'))
by['lamps']['summary']='Tests the fictional indicators and block-filled LCD for an approximately two-second training interval, then returns to the menu. This does not certify physical indicators or reproduce firmware timings exactly.'
by['code2']['sourceRefs'].append(dict(sourceId='xfp-user',pdfPage=19,printedPage='19'))
by['code2']['summary']='Change and confirm the fictional level-2 code. On these keyswitch variants it does not affect keyswitch entry; the user manual permits this at level 2.'
(root/'public/app/data/xfp.json').write_text(json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n')
print(len(nodes),'nodes',len(data['lessons']),'lessons')
