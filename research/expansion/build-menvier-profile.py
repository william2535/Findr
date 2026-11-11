"""Build the Menvier selected-route practice profile from the reviewed atlas.
The complete free emulator uses the atlas; these seven lessons use bounded paths.
"""
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[2]
atlas = json.loads((ROOT/'public/app/data/menu-maps/menvier-mseries.json').read_text())
def refs(page, source='eng5'):
    return [{'sourceId':source, 'printedPage':str(page), 'pdfPage':page+2}]

nodes = {
    'root': {'kind':'menu','label':'Engineer levels','parent':None,'children':['engineer-2'],'virtual':True,'selectedSubset':True,'sourceRefs':refs(21)},
    'engineer-2': {'kind':'menu','label':'Engineer Menu 2','parent':'root','code':'2','children':['zone-status','built-in-tests','log-functions'],'selectedSubset':True,'sourceRefs':refs(82)},
    'zone-status': {'kind':'zones','label':'View Zones','parent':'engineer-2','code':'1','numericSelection':True,'detailsKey':'none','resistance':False,'sourceRefs':refs(83)},
    'built-in-tests': {'kind':'menu','label':'Built In Tests','parent':'engineer-2','code':'7','children':['equipment'],'selectedSubset':True,'sourceRefs':refs(101)},
    'equipment': {'kind':'menu','label':'Equipment','parent':'built-in-tests','code':'3','children':['zone-resistance'],'selectedSubset':True,'sourceRefs':refs(106)},
    'zone-resistance': {'kind':'zones','label':'Zone Resistance','parent':'equipment','code':'4','numericSelection':True,'detailsKey':'none','resistance':True,'sourceRefs':refs(108)},
    'log-functions': {'kind':'menu','label':'Log Functions','parent':'engineer-2','code':'8','children':['view-log'],'selectedSubset':True,'sourceRefs':refs(116)},
    'view-log': {'kind':'log','label':'View Log','parent':'log-functions','code':'1','detailsKey':'change','sourceRefs':refs(116)},
    'user-root': {'kind':'menu','label':'M800 User levels · 2010','parent':None,'children':['user-1'],'sessionRoot':True,'selectedSubset':True,'sourceRefs':refs(2,'manager2010')},
    'user-1': {'kind':'menu','label':'User Menu 1','parent':'user-root','code':'1','children':['test-menu','omit-zones'],'selectedSubset':True,'sourceRefs':refs(72,'manager2010')},
    'test-menu': {'kind':'menu','label':'Test Menu','parent':'user-1','code':'1','children':['walk-ready'],'selectedSubset':True,'sourceRefs':refs(3,'manager2010')},
    'walk-ready': {'kind':'walk-ready','label':'Walk Test','parent':'test-menu','code':'2','next':'walk-active','lines':['Walk Test Wards','Ward > 1***'],'areaFixture':['1'],'sourceRefs':refs(4,'manager2010')},
    'walk-active': {'kind':'walk-run','label':'Walk Test','parent':'walk-ready','virtual':True,'all':True,'finishKey':'back','areaFixture':['1'],'sourceRefs':refs(4,'manager2010')},
    'omit-zones': {'kind':'zone-omit','label':'Omit Zones','parent':'user-1','code':'2','toggleKeys':['change'],'toggleLabel':'Toggle','recordAdvanceKey':'enter','finishKey':'back','numericSelection':True,'eligibleOnly':True,'sourceRefs':refs(7,'manager2010')},
}
user_route = ['user-root','user-1','omit-zones']
tasks = []
for restore in [False,True]:
    tasks.append({
        'id':'restore-zone' if restore else 'omit-zone',
        'title':'Re-enable a device — reinstate its zone' if restore else 'Disable a device — omit its zone',
        'description':('Reinstate' if restore else 'Omit')+' the fictional Hall PIR on zone 0002, then leave the omit list.',
        'category':'restore' if restore else 'omission',
        'relatedTaskId':'omit-zone' if restore else 'restore-zone',
        'aliases':['reinstate detector','restore device','include zone','undo bypass'] if restore else ['disable device','bypass detector','isolate sensor','turn off detector','omit zone'],
        'startNodeId':'user-root','sessionStart':'Already authorised M800 manager practice · 2010 manual','sessionLabel':'SIMULATED M800 MANAGER SESSION',
        'path':['1 User Menu 1','2 Omit Zones','0002 Hall PIR','Toggle to '+('reinstate' if restore else 'omit'),'ESC to finish'],
        'routeNodeIds':user_route,
        'hints':['Select 1 → ENT, then 2 → ENT. This is the separate M800 Manager menu.',
                 'Type all four digits 0002, or use the arrow keys to find Hall PIR.',
                 'Press the physical Toggle key to '+('reinstate' if restore else 'omit')+' the zone. ENT advances to another zone; ESC finishes.'],
        'initialOmissions':{'0002':restore},
        'goal':{'kind':'omission','zone':'0002','value':not restore},
        'completionMessage':'Hall PIR is '+('included again' if restore else 'omitted')+' in this fictional M800 session.',
        'sourceRefs':refs(7,'manager2010'),
    })
tasks += [
    {'id':'check-resistance','title':'Check zone resistance','description':'Find the actual Zone Resistance route and read Hall PIR’s simulated circuit.',
     'aliases':['zone ohms','loop resistance','check a PIR','resistor reading'],
     'path':['2 Engineer Menu 2','7 Built In Tests','3 Equipment','4 Zone Resistance','0002 Hall PIR'],
     'routeNodeIds':['root','engineer-2','built-in-tests','equipment','zone-resistance'],
     'hints':['Enter 2 → ENT, 7 → ENT, 3 → ENT, 4 → ENT. Each number belongs to its current menu.',
              'Enter 0002. The fictional healthy 4K7/2K2 loop reads 02.200 K Ohms.',
              'Use the detector control to compare Active 06.900 K Ohms and the panel open-circuit display 11.463 K Ohms.'],
     'goal':{'kind':'zone','zone':'0002','resistance':True},'sourceRefs':refs(108)+refs(83)},
    {'id':'view-zone-status','title':'Read a zone’s state','description':'Use View Zones to identify the fictional Hall PIR’s healthy, active or tamper state.',
     'aliases':['is a detector open','view zones','zone status','is PIR healthy'],
     'path':['2 Engineer Menu 2','1 View Zones','0002 Hall PIR'],
     'routeNodeIds':['root','engineer-2','zone-status'],
     'hints':['Enter 2 → ENT, then 1 → ENT. View Zones and Zone Resistance are separate routes.',
              'Type all four digits 0002, or scroll to Hall PIR. The screen shows the fictional circuit state.'],
     'goal':{'kind':'zone','zone':'0002','resistance':False},'sourceRefs':refs(83)},
    {'id':'find-last-alarm','title':'Find the last alarm','description':'Find the fictional Store PIR alarm in the event log and show its associated text.',
     'aliases':['alarm history','what set it off','previous alarm','view log'],
     'path':['2 Engineer Menu 2','8 Log Functions','1 View Log','ALARM 0004','Toggle for details'],
     'routeNodeIds':['root','engineer-2','log-functions','view-log'],
     'hints':['Enter 2 → ENT, then 8 → ENT, then 1 → ENT.',
              'The up arrow moves to earlier events. Find ALARM 0004.',
              'Press the physical Toggle key to reveal Store PIR. The # key is not the log-detail control.'],
     'goal':{'kind':'log','event':'zone-0004-alarm','details':True},'sourceRefs':refs(116)},
    {'id':'walk-test-pir','title':'Walk-test a PIR','description':'Start the fictional Ward 1 walk test, activate Store PIR, and stop the test.',
     'aliases':['test detector','walk test','test movement sensor','test PIR'],
     'startNodeId':'user-root','sessionStart':'Already authorised M800 manager practice · 2010 manual','sessionLabel':'SIMULATED M800 MANAGER SESSION',
     'path':['1 User Menu 1','1 Test Menu','2 Walk Test','Ward 1','Store PIR'],
     'routeNodeIds':['user-root','user-1','test-menu','walk-ready','walk-active'],
     'hints':['Enter 1 → ENT, then 1 → ENT, then 2 → ENT.',
              'Ward 1 is the fixed practice selection. Press ENT to start.',
              'Activate Store PIR with FINDR’s detector control, then press ESC to stop. The physical post-test result list is simplified.'],
     'goal':{'kind':'walk','zone':'0004'},'sourceRefs':refs(4,'manager2010')},
    {'id':'leave-engineering','title':'Leave engineer menus','description':'Return through the menu levels and confirm the engineer-exit prompt.',
     'aliases':['exit engineer','finish programming','leave engineer mode','save and leave'],
     'path':['Engineer levels','ESC','Leave Menus','ENT'],
     'routeNodeIds':['root'],
     'hints':['Press ESC to return through the menu levels.',
              'At Engineer levels, press ESC to display the leave-menus prompt, then ENT.'],
     'goal':{'kind':'logout'},'sourceRefs':refs(21)+refs(22)},
]

profile = {
    'id':'menvier-mseries','brand':'Menvier','title':'Menvier M750 / M800',
    'keypad':'Classic M Series LCD · MKP3 style',
    'edition':'Engineer 496966 Issue 5 (2006) · separate M800 Manager 11821957 (2010)',
    'scope':'M750/M800 engineer menu baseline plus a separately labelled later M800 manager menu. The seven guided lessons are selected routes; the free emulator uses the complete reviewed atlas. This is not Menvier30/40/100/300 or TS-series.',
    'panelIds':[], 'allFixtureValuesSimulated':True,
    'fixtureNotice':'Every name, event, reading and detector action shown here is fictional FINDR practice data.',
    'sessionStart':'Already authorised practice session','lcdNotice':'Documented menu labels; populated displays and spacing are illustrative.',
    'rightIsEnter':False,'leftIsBack':False,'commitOnExit':True,'exitFromRoot':True,'hideTypeCodes':False,'exitChecks':False,'reverseLogScroll':True,
    'exitPrompt':['Press [Ent] To','Leave Menus'],
    'enterLabel':'ENT','backLabel':'ESC','editLabel':'Toggle','directMenuCodes':True,'zoneDigits':4,'typeLabel':'Zone Type',
    'circuit':'Fictional 4K7/2K2 FSL panel input. The open-circuit display is the documented panel reading, not a multimeter measurement.',
    'readings':{'secure':'02.200 K Ohms','active':'06.900 K Ohms','tamper':'11.463 K Ohms'},
    'statusLabels':{'secure':'Healthy','active':'Active','tamper':'Tamper'},
    'zones':[{'address':'000'+str(i),'name':label,'type':'Normal Alm','omitEnabled':True} for i,label in enumerate(['Front Door','Hall PIR','Office PIR','Store PIR'],1)],
    'zoneTypes':[{'code':node['code'],'label':node['label']} for node in atlas['nodes'] if node['parentId']=='m-zone-type'],
    'events':[
        {'id':'ward-unset','label':'UNSET WARDS:-','zone':'','time':'10:37:10 29/10','details':'Ward 1 · demo manager','sourceRefs':refs(116)},
        {'id':'ward-reset','label':'RESET WARDS:-','zone':'','time':'10:35:12 29/10','details':'Ward 1 · fictional reset','sourceRefs':refs(121)},
        {'id':'zone-0004-alarm','label':'ALARM 0004','zone':'0004','time':'10:35:00 29/10','details':'Store PIR · fictional alarm','logs':['alarm'],'sourceRefs':refs(119)},
        {'id':'ward-set','label':'SET WARDS:-','zone':'','time':'09:00:00 29/10','details':'Ward 1 · demo manager','sourceRefs':refs(116)},
    ],
    'sources':atlas['sources'],
    'limitations':[
        'The 2006 Engineer and 2010 Manager manuals are separate baselines. The M800 manager additions are not asserted to exist on M750 or to match the older firmware.',
        'No attached alarm has been tested. All inputs, codes, schedules and events are fictional and no live communications are possible.',
        'The seven lessons expose selected paths. The free emulator maps the wider menu tree with explicit reference-only and simplified branches.',
        'Four fictional panel zones and Ward 1 are used in the lessons. No network jump, radio enrolment, multi-ward walk selection or physical output is performed.',
        'Free text uses a FINDR helper. Some conditional output fields, calendar allocation masks, custom logic and fault diagnostics require further keypad evidence.',
    ],
    'keys':([{'id':str(i),'label':str(i),'ariaLabel':str(i)} for i in [1,2,3,4,5,6,7,8,9,0]] + [
        {'id':'previous','label':'▲','ariaLabel':'Up: previous option; earlier event in the log'},
        {'id':'change','label':'↔','ariaLabel':'Toggle: change omission or show log details'},
        {'id':'next','label':'▼','ariaLabel':'Down: next option; newer event in the log'},
        {'id':'details','label':'#','ariaLabel':'Hash key'},
        {'id':'enter','label':'ENT','ariaLabel':'Enter: select, accept or advance'},
        {'id':'back','label':'ESC','ariaLabel':'Escape: return or cancel the unconfirmed field'},
    ]),
    'controls':[
        {'label':'▲ / ▼','description':'Browse menus and records. In the event log, up goes earlier and down goes newer.'},
        {'label':'ENT / ESC','description':'ENT selects or accepts; ESC returns. Confirm the final leave-menus prompt to commit engineer programming.'},
        {'label':'Toggle','description':'Changes an omission, toggles a selected attribute, or reveals log details. It is separate from the # key.'},
        {'label':'0–9','description':'Select a local numbered menu, then ENT. Zones use their complete four-digit address.'},
        {'label':'Omit Zones','description':'Toggle changes the selected eligible zone; ENT advances to another zone; ESC finishes.'},
    ],
    'omissionInfo':{'label':'What “disable” means here','meaning':'Omission excludes an eligible ordinary intruder zone from setting. It does not disconnect or power off the detector. Shunting 24-hour zones is a separate menu.',
        'duration':'A normal omitted zone is automatically reinstated when its ward is next unset.',
        'restore':'Return to User 1 → Omit Zones, select the zone, Toggle it to its included state and press ESC.'},
    'nodes':nodes,'tasks':tasks,
}
(ROOT/'research/expansion/menvier-profile.json').write_text(json.dumps(profile,indent=2,ensure_ascii=False)+'\n')
print('Menvier practice profile:',len(tasks),'guided tasks;',len(nodes),'selected-route nodes')
