"""Selected source-supported LightSYS2 lessons; the full atlas powers free mode."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
atlas=json.loads((ROOT/'public/app/data/menu-maps/risco-lightsys2.json').read_text())
def refs(p,s='user-uk-e'):return [{'sourceId':s,'printedPage':str(p),'pdfPage':p}]
nodes={}
def node(id,label,kind,parent,p,s='user-uk-e',**kw):
 nodes[id]={'kind':kind,'label':label,'parent':parent,'sourceRefs':refs(p,s),**kw}
 if parent is not None:nodes[parent].setdefault('children',[]).append(id)
node('root','Installer Programming','menu',None,74,'installer-g',autoDigits=True,selectedSubset=True,children=[])
for i,label in enumerate(['System','Zones','Outputs','Codes','Communication','Audio','Install','Devices'],1):
 node('eng-'+str(i),label,'info','root',{1:74,2:101,3:135,4:148,5:152,6:187,7:191,8:208}[i],'installer-g',code=str(i),lines=[label,'Open free emulator'])
node('exit','Exit','logout','root',73,'installer-g',code='0',confirmExit=True)
node('user-root','UK User Functions','menu',None,46,sessionRoot=True,children=[])
node('activities','Activities','menu','user-root',46,children=[])
node('omit','Omit','menu','activities',46,children=[])
node('omit-zones','Zones','menu','omit',40,children=[])
node('omit-once','One Time Only','zone-omit','omit-zones',40,toggleKeys=['part-set'],toggleLabel='Part Set',commitKey='enter',finishKey='back',numericSelection=False,eligibleOnly=True)
node('omit-reset','Omit Reset','info','omit-zones',46,lines=['Omit Reset','Reference in free mode'])
node('omit-recall','Omit Recall','info','omit-zones',46,lines=['Omit Recall','Reference in free mode'])
node('omit-permanent','Permanent Omit','info','omit-zones',40,lines=['Permanent Omit','Use free emulator'])
node('omit-tamper','Tamper omit','info','omit',46,lines=['Tamper omit','Conditional feature'])
for id,label,p in [('outputs','Outputs',46),('sound','Keypad Sound',47),('anti','Anti Code',47),('cs','Configure SW',47),('sim','Prepaid SIM',47),('advanced','Advanced',48)]:node(id,label,'info','activities',p,lines=[label,'Open free emulator'])
node('followme','Follow Me','info','user-root',48,lines=['Follow Me','Open free emulator'])
node('view','View','menu','user-root',49,children=[])
for id,label in [('fault','Fault'),('alarm-memory','Alarm Memory'),('partition-status','Partition Status')]:node(id,label,'info','view',49,lines=[label,'Open free emulator'])
node('zone-status','Zone Status','zones','view',49,numericSelection=False,resistance=False,detailsKey='none')
for id,label,p in [('service-info','Service Info',49),('ip','IP Address',50)]:node(id,label,'info','view',p,lines=[label,'Open free emulator'])
for id,label in [('codes','Codes/Tags'),('clock','Clock')]:node(id,label,'info','user-root',50,lines=[label,'Open free emulator'])
node('event-log','Event Log','log','user-root',51,detailsKey='none')
node('maintenance','Maintenance','menu','user-root',51,children=[])
node('walk','Walk test','menu','maintenance',51,children=[])
node('walk-full','Full walk test','walk-run','walk',51,all=True,finishKey='back')
node('walk-quick','Quick walk test','info','walk',51,lines=['Quick walk test','Use free emulator'])
for id,label in [('keypad-test','Keypad test'),('sounder-test','Sounder test'),('strobe-test','Strobe test')]:node(id,label,'info','maintenance',51,lines=[label,'Use free emulator'])
for id,label in [('macro','Macro'),('keyfobs','Stand Alone Keyfobs')]:node(id,label,'info','user-root',51,lines=[label,'Open free emulator'])

node('service-root','Installer operations','menu',None,219,'installer-g',sessionRoot=True,children=[])
for id,label,p in [('s-activities','Activities',219),('s-followme','Follow Me',219),('s-view','View',220),('s-clock','Clock',221),('s-log','Event Log',221)]:node(id,label,'info','service-root',p,'installer-g',lines=[label,'Open free emulator'])
node('s-maintenance','Maintenance','menu','service-root',221,'installer-g',children=[])
for id,label,p in [('s-walk','Walk Test',221),('s-siren','Siren Test',222),('s-strobe','Strobe Test',222)]:node(id,label,'info','s-maintenance',p,'installer-g',lines=[label,'Open free emulator'])
node('resistance','Zone Resistance','zones','s-maintenance',222,'installer-g',numericSelection=False,resistance=True,detailsKey='enter')
node('s-diagnostics','Diagnostics','info','s-maintenance',222,'installer-g',lines=['Diagnostics','Open free emulator'])
for id,label in [('s-macro','Macro'),('s-keyfobs','Stand Alone Keyfobs')]:node(id,label,'info','service-root',223,'installer-g',lines=[label,'Open free emulator'])

tasks=[]
for restore in [False,True]:
 tasks.append({'id':'restore-zone' if restore else 'omit-zone','title':'Re-enable a device — restore its zone' if restore else 'Disable a device — omit its zone','description':('Restore' if restore else 'Omit')+' the fictional Hall PIR, then confirm with OK.','category':'restore' if restore else 'omission','relatedTaskId':'omit-zone' if restore else 'restore-zone','aliases':['restore device','reinstate detector','undo bypass'] if restore else ['disable device','bypass detector','isolate zone'],'startNodeId':'user-root','sessionStart':'Already authorised UK Grand Master practice · user E (2021)','sessionLabel':'SIMULATED UK USER SESSION','path':['Activities','Omit','Zones','One Time Only','02 Hall PIR','Part Set','OK'],'routeNodeIds':['user-root','activities','omit','omit-zones','omit-once'],'hints':['Use the arrows and OK to select Activities → Omit → Zones → One Time Only. These user-menu numbers are not specified by the source.','Use the down arrow to find 02 Hall PIR. Press the HOUSE / Part Set key to change its omit selection.','Press the green OK key to confirm; Menu/Back would discard an unconfirmed choice.'],'initialOmissions':{'02':restore},'goal':{'kind':'omission','zone':'02','value':not restore},'completionMessage':'Hall PIR is '+('included again' if restore else 'omitted for the next setting')+' in this fictional lesson.','sourceRefs':refs(40)+refs(46)})
tasks.extend([
 {'id':'check-resistance','title':'Read a zone’s resistance','description':'Use the installer operations menu to read Hall PIR’s fictional resistance.','aliases':['ohms','loop resistance','check PIR resistance'],'startNodeId':'service-root','sessionStart':'Already authorised installer operations · G (2020)','path':['Maintenance','Zone Resistance','02 Hall PIR'],'routeNodeIds':['service-root','s-maintenance','resistance'],'hints':['Scroll to Maintenance and press OK, then select Zone Resistance. This is separate from programming 2.1.3 Resistance, which configures end-of-line values.','Use the down arrow to find Hall PIR. Its fictional healthy reading is 2.20 kΩ.','The full emulator also follows the documented OK toggle between resistance and voltage. This lesson focuses on locating and reading resistance.'],'goal':{'kind':'zone','zone':'02','resistance':True},'sourceRefs':refs(222,'installer-g')},
 {'id':'view-zone-status','title':'Read a zone’s state','description':'Use the UK View menu to find the fictional Hall PIR.','aliases':['zone status','open zone','detector healthy'],'startNodeId':'user-root','path':['View','Zone Status','02 Hall PIR'],'routeNodeIds':['user-root','view','zone-status'],'hints':['Scroll to View and press OK. Scroll to Zone Status and press OK.','Use the arrows to find Hall PIR. The detector controls below change its fictional status.'],'goal':{'kind':'zone','zone':'02','resistance':False},'sourceRefs':refs(49)},
 {'id':'find-last-alarm','title':'Find the last alarm','description':'Find the fictional Store PIR alarm in Event Log.','aliases':['alarm history','what set it off','event history'],'startNodeId':'user-root','path':['Event Log','Alarm Z=04'],'routeNodeIds':['user-root','event-log'],'hints':['Scroll to Event Log and press OK.','Use the down arrow to move through the fictional history until Alarm Z=04 appears.','The source log cannot be erased. The full emulator also models the ten-event Part Set / Full Set jumps.'],'goal':{'kind':'log','event':'zone-04-alarm','details':False},'sourceRefs':refs(51)+refs(242,'installer-g')},
 {'id':'walk-test-pir','title':'Walk-test a PIR','description':'Start Full walk test, activate the fictional Store PIR, and stop the test.','aliases':['test PIR','walk test','test movement detector'],'startNodeId':'user-root','path':['Maintenance','Walk test','Full walk test','Activate Store PIR','Menu/Back'],'routeNodeIds':['user-root','maintenance','walk','walk-full'],'hints':['Scroll to Maintenance → Walk test → Full walk test, confirming each with OK.','Activate Store PIR with FINDR’s detector control.','Press Menu/Back to stop. The lesson shows a simplified count; the full emulator distinguishes Full detected-zone and Quick undetected-zone displays.'],'goal':{'kind':'walk','zone':'04'},'sourceRefs':refs(51)},
 {'id':'leave-engineering','title':'Save and leave installer programming','description':'Use the documented 0 then OK exit route.','aliases':['exit installer','save programming','leave engineer mode'],'path':['Installer Programming','0 Exit','OK'],'routeNodeIds':['root','exit'],'hints':['At the main installer programming menu, press 0.','Press green OK to save and exit. The full emulator blocks a simulated tamper; fault handling beyond the four demo inputs remains a reference limitation.'],'goal':{'kind':'logout'},'sourceRefs':refs(73,'installer-g')}
])
profile={
 'id':'risco-lightsys2','brand':'RISCO','title':'RISCO LightSYS2','keypad':'Classic RP432KP / RP432KPP LCD','edition':atlas['baseline'],'scope':atlas['scope'],'panelIds':['risco-lightsys-2'],'allFixtureValuesSimulated':True,
 'fixtureNotice':'Every name, event, setting and electrical reading is fictional FINDR practice data. No live panel connection exists.','sessionStart':'Already authorised installer programming practice','lcdNotice':'Manual labels are sourced; populated LCD spacing and fixture displays are illustrative.',
 'rightIsEnter':False,'leftIsBack':False,'commitOnExit':True,'exitFromRoot':False,'hideTypeCodes':False,'exitChecks':False,'reverseLogScroll':False,'exitPrompt':['Exit and SAVE?','Press OK'],
 'enterLabel':'OK','backLabel':'Menu / Back','editLabel':'Full / Part Set','directMenuCodes':False,'zoneDigits':2,'typeLabel':'Type','navigation':{'menuNextKey':'next','menuPreviousKey':'previous','recordNextKey':'next','recordPreviousKey':'previous'},
 'circuit':'Fictional wired detector circuit; readings are independent teaching fixtures, not panel calibration or a voltage-to-resistance conversion.','readings':{'secure':'2.20 kΩ','active':'4.40 kΩ','tamper':'Open circuit'},'statusLabels':{'secure':'Closed','active':'Open','tamper':'Tamper'},
 'zones':[{'address':str(i).zfill(2),'name':label,'type':'Exit/Entry 1' if i==1 else 'Instant','omitEnabled':True,'areas':['1']} for i,label in enumerate(['Front Door','Hall PIR','Office PIR','Store PIR'],1)],
 'zoneTypes':[{'code':n['code'],'label':n['label']} for n in atlas['nodes'] if n['parentId']=='r-e2.1.2.3' and n['kind']=='selection'],
 'events':[{'id':'demo-disarm','label':'Dis:P=1 C=01','zone':'','time':'14:32 29/10/26','details':'Demo user · fictional unset','sourceRefs':refs(244,'installer-g')},{'id':'demo-restore','label':'Restore Z=04','zone':'04','time':'14:30 29/10/26','details':'Store PIR · fictional restore','sourceRefs':refs(250,'installer-g')},{'id':'zone-04-alarm','label':'Alarm Z=04','zone':'04','time':'14:29 29/10/26','details':'Store PIR · fictional alarm','logs':['alarm'],'sourceRefs':refs(242,'installer-g')},{'id':'demo-arm','label':'ARM:P=1 C=01','zone':'','time':'13:00 29/10/26','details':'Demo user · fictional full set','sourceRefs':refs(242,'installer-g')}],
 'sources':atlas['sources'],'limitations':['Installer G (2020) and UK user E (2021) are separately labelled baselines; this is not LightSYS+ or a claim about current firmware.','The seven guided lessons cover selected supported routes. Free exploration exposes the larger sourced tree, with explicit reference-only conditional hardware branches.','UK user and installer operations use scroll navigation because their source tables do not publish exact numeric shortcuts.','One By One zone programming, output programming, RF/device enrolment, firmware, reset/anticode and remote communications are reference-only.','The source requires 0 then OK to save installer changes. Only the free emulator models the demo tamper exit gate.','The basic lesson engine simplifies walk-test result text and resistance/voltage views; the free emulator implements the distinct source functions.'],
 'keys':[{'id':str(i),'label':str(i),'ariaLabel':str(i),'secondaryLabel':{1:'A',2:'B',3:'C',4:'Fire',5:'D',6:'Fire',7:'Medical',9:'Medical'}.get(i,'')} for i in [1,2,3,4,5,6,7,8,9,0]]+[
  {'id':'panic-left','label':'P','ariaLabel':'Left panic key: emergency combination is outside this practice scope'},
  {'id':'panic-right','label':'P','ariaLabel':'Right panic key: emergency combination is outside this practice scope'},
  {'id':'arm','label':'🔒','ariaLabel':'Full Set: closed padlock, change programming data'},
  {'id':'part-set','label':'⌂','ariaLabel':'Part Set: house key, select or restore an omitted zone'},
  {'id':'previous','label':'↑ i','ariaLabel':'Up / Status: previous option or move cursor left'},
  {'id':'next','label':'↓','ariaLabel':'Down / Omit: next option or move cursor right'},
  {'id':'back','label':'↩','ariaLabel':'Menu / Back: return or discard unconfirmed data'},
  {'id':'enter','label':'OK','ariaLabel':'Unset / OK: enter, confirm or save'}],
 'physicalLayout':[['panic-left','previous','panic-right'],['part-set','next','arm'],['1','2','3'],['4','5','6'],['7','8','9'],['back','0','enter']],
 'controls':[{'label':'↑ / ↓','description':'Browse the displayed menu or detector list. UK user menus use scrolling, not invented shortcut numbers.'},{'label':'OK / Menu','description':'Green OK accepts a selection; Menu/Back returns or discards unconfirmed data.'},{'label':'Full / Part Set','description':'Changes programming choices. The HOUSE / Part Set key selects a zone for omission, then OK confirms.'},{'label':'0–9','description':'Installer quick keys select consecutive local options. Preserve two-digit values such as 01; the keypad does not treat a whole path as one field.'},{'label':'0 then OK','description':'Exit and save at the installer main menu.'}],
 'omissionInfo':{'label':'What “disable” means here','meaning':'Omit excludes an eligible ordinary intrusion zone; it does not disconnect or power off the device.','duration':'One Time Only is reinstated after the next set-and-unset cycle. Permanent Omit remains until changed; it has a separate screen in free mode.','restore':'Return to Activities → Omit → Zones → One Time Only, find the zone, change it with Part Set and confirm with OK.'},'nodes':nodes,'tasks':tasks
}
(ROOT/'research/expansion-0.9.0/risco-profile.json').write_text(json.dumps(profile,indent=2,ensure_ascii=False)+'\n')
print('Wrote Risco profile with',len(tasks),'guided lessons')
