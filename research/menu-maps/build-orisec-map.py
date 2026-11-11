"""Reproduce the legacy Orisec programming index from the identified source PDF.

Run with the research PDF directory as argument. Only short factual menu/field
labels are extracted. Summaries, scope and conflict handling are authored here.
The PDF is not redistributed with FINDR.
"""
from pathlib import Path
import sys, re, json, hashlib
import fitz

root = Path(__file__).resolve().parents[2]
pdfdir = Path(sys.argv[1])
doc = fitz.open(pdfdir / 'orisec-cp25-50-100-installer.pdf')
nodes = []
def slug(s): return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')
def add(id, parent, label, page, code=None, kind='menu', summary='', source='ins008', **extra):
    n = dict(id=id, parentId=parent, order=sum(x['parentId']==parent for x in nodes)+1,
             label=label, code=code, kind=kind, access='Engineer' if source=='ins008' else 'Authorised user; permissions depend on user type',
             summary=summary, aliases=[], conditions=[], notes=[], practiceTaskIds=[],
             sourceRefs=[dict(sourceId=source, printedPage=str(page), pdfPage=page)])
    n.update(extra); nodes.append(n); return n

eng = add('engineer', None, 'Engineer menu · INS008 (2018)', 30,
          summary='Legacy CP-25 / CP-50 / CP-100 engineer reference. Top-level entries are indexed in the manual chapter order, not asserted as a verified screen order.',
          notes=['The manual contradicts itself on two top-level shortcuts. Select by the displayed label; full top-level numbering needs a matching firmware menu capture.', 'A printed chapter number is not a keypad shortcut.'])
program = add('programming', 'engineer', 'Programming menu', 30,
              summary='Contains the documented programming groups 00–24. A number is local to this submenu; it is not a complete code from the engineer home screen.',
              notes=['Field and value entries below are a reference index of documented settings. They are not all separate successive LCD screens.'])

main = None
field = None
pending = None
last = None
enum_fields = {'Zone Type','Zone Wiring','Zone Chime','Zone Soak Test','Area Full Arm Mode','Area Part Arm Mode','User Type','System Type','Control Type','Remote Type','ARC Protocol'}
reference_fields = {'CSL / Emizon / BT Redcare Setup','WebWayOne Setup'}

# PDF content stream follows the authored left column then right column. Font
# sizes distinguish numbered groups, field headings and option/parameter labels.
for page in range(31,64):
    for block in doc[page-1].get_text('dict')['blocks']:
        for line in block.get('lines', []):
            spans = [s for s in line['spans'] if s['font']=='SegoeUI-Semibold' and s['text'].strip() and s['size']>=8.9]
            if not spans: continue
            text = ' '.join(s['text'].strip() for s in spans)
            size = spans[0]['size']
            if size > 13:
                if re.fullmatch(r'\d{2}',text):
                    if last and last['parentId']=='programming': last['code']=text;last['codeType']='menu'
                    continue
                main = add('program-'+slug(text), 'programming', text, page,
                           summary='Documented programming group. Choose this label within Programming menu; subsequent field order follows the manual reference.',
                           notes=['Select the relevant zone, area, user, output or module where the panel requests one. The group number alone does not select that item.'])
                field = None; pending = None; last = main
            elif size > 10:
                field = add(main['id']+'-'+slug(text), main['id'], text, page,
                            kind='reference' if text in reference_fields else 'setting',
                            summary=('Implementation guidance in the ARC section; not established as a separate keypad screen.' if text in reference_fields else 'Documented field or group of related settings. See the source page for values and configuration effects.'))
                pending = None; last = field
            else:
                if re.fullmatch(r'\d+', text): pending=text; continue
                inline=re.fullmatch(r'(\d+)\s{2,}(.+)',text)
                if inline: pending,text=inline.groups()
                parent=field or main
                kind='selection' if parent['label'] in enum_fields or main['label']=='Com Port Setup' else 'setting'
                ident=parent['id']+'-'+slug(text)
                if any(n['id']==ident for n in nodes): ident+='-'+str(pending or page)
                n=add(ident,parent['id'],text,page,pending,kind,
                      summary=('Documented choice for '+parent['label']+'. This value code is not a menu address.' if kind=='selection' else 'Documented parameter or option within '+parent['label']+'. Its number, when shown, identifies this field or flag rather than a complete menu path.'),
                      codeType='value' if kind=='selection' else 'parameter')
                last=n;pending=None

# Improve the most commonly queried field explanations without reproducing the
# manual's prose or claiming firmware behaviour beyond this edition.
descriptions={
 'Zone Type':'Defines how the selected detector input is interpreted by the panel.',
 'Zone Text':'The descriptive name shown for the selected zone.',
 'Zone Wiring':'Matches the zone input processing to its documented wiring/resistor scheme.',
 'Zone Areas':'Associates the selected zone with areas. CP-25 supports 2 areas, CP-50 supports 5 and CP-100 supports 10. This source’s detailed Zone Areas list stops at 5.',
 'Zone Omit':'Installer permissions and automatic omission rules for the selected zone. This is different from temporarily omitting a zone in the user menu.',
 'Manual Omit':'Allows a permitted user to omit this zone. This setting does not itself perform the user omission.',
 'Zone Attributes':'Additional behaviour flags for the selected zone.',
 'Zone Chime':'Selects the zone’s chime response.',
 'Zone Soak Test':'Places the selected zone into the documented soak-test regime; this is distinct from walk testing.',
 'Zone Camera':'Associates the selected zone with a configured camera.',
 'Voice Message':'Chooses the message associated with the zone.',
 'System Timers':'Global time parameters; these are separate from the per-area entry, exit and bell timers.',
 'System Limits':'System counters and limits.',
 'Reinstate on Disarm':'Determines whether omitted zones are automatically brought back into monitoring on disarm in this baseline.',
 'System Standards':'Installer configuration flags named for the listed standards; the flags alone do not establish installation compliance.',
 'Current Limits (CP-50 and CP-100)':'Current limit parameters documented only for CP-50 and CP-100.',
 'Area Full Arm Mode':'How the selected area completes its full-setting process.',
 'Area Part Arm Mode':'How the selected area completes its part-setting process.',
 'Area Engineer Control':'Area-level engineer access and reset permissions.',
 'Area Bell Control':'Area-level sounder, strobe and signalling behaviour flags.',
 'Area Timers':'Entry, exit, settling, bell and signalling timings for the selected area.',
 'System Messages':'Editable display text and company/site identification fields.',
 'User and Engineer Codes':'Passcode configuration for the selected user record.',
 'User Type':'Role selection for the selected user record; Engineer and Master restrictions are described in the source.',
 'User Areas':'Areas accessible to the selected user. CP-25 supports 2 areas, CP-50 supports 5 and CP-100 supports 10.',
 'NFC':'Tag association for the selected user.',
 'Key Fob':'Wireless fob association for the selected user.',
 'Locked by chain':'A chain can control availability of the selected user.',
 'System Type':'System-event output function choices. The listed codes are output function values, not engineer menu addresses.',
 'Output Attributes':'Output behaviour flags applied to the selected output.',
 'Output Areas':'Area assignment for an output. CP-25 supports 2 areas, CP-50 supports 5 and CP-100 supports 10.',
 'Keypad Menus':'Enables or hides additional keypad user features.',
 'Map Zone 1':'Maps a keypad input to a system zone.',
 'Map Zone 2':'Maps a second keypad input to a system zone.',
 'Map Zone 3':'Maps the third supported keypad input to a system zone.',
 'Com Port Setup':'Communication-port function choices; available physical ports differ by panel model.',
 'GSM Settings':'APN, SIM and credit-query parameters for a fitted GSM module.',
 'Ethernet settings':'Network-addressing fields for a fitted Ethernet module.',
 'Wi-Fi settings':'Wireless-network identification and IP connection fields.',
 'ARC Protocol':'Reporting protocol selected for the relevant receiving-centre record.',
 'Reported':'Event report groups enabled for the selected ARC.',
 'Cancel':'Which ARC call sequences this record can stop after successful reporting.',
 'Test Call Every':'Periodic test-call timing; zero changes which scheduling fields apply. Check the cited page before changing.',
 'Camera IP Address':'Configured camera endpoints referenced by zone-camera associations.',
 'Chain Timer':'Limits a chain’s active duration; the Omit key changes seconds/minutes in this editing context.',
 'Remote Output Timer':'Controls the duration of a remote output; the Omit key changes seconds/minutes in this editing context.'
}
for n in nodes:
    if n['label'] in descriptions:n['summary']=descriptions[n['label']]
    if n['id']=='program-panel-outputs-system-type-in-2-entry':n['label']='In 2nd Entry';n['aliases']=['In second entry']
    if n['id']=='program-com-port-setup':n['notes'].append('CP-25 has COM 1 and RS-485; CP-50 / CP-100 additionally have COM 2 (INS008 p56).')
    if n['id']=='program-com-port-setup-radio-coms':n['conditions'].append('Radio Coms is CP-50 / CP-100 only (INS008 p56).')
    if n['id']=='program-panel-outputs-system-type-bell-power-off':n['conditions'].append('CP-50 / CP-100 only (INS008 p50).')
    if n['parentId']=='program-panel-outputs' and n['label'] not in ['Output Attributes','Output Areas']:
        n['kind']='reference' if n['label'] in ['System Type','Control Type','Remote Type'] else 'selection'
        n['summary']=('Output-function family; its documented function values are listed below. These are choices for an output, not separate global menu commands.' if n['kind']=='reference' else 'Alternative output function. The associated zone, user, device or threshold depends on the chosen function; see the source page.')
        n['notes'].append('No numeric function code is inferred when this heading has no printed code.')
    if n['parentId']=='program-panel-outputs-output-areas':
        area=int(n['label'].split()[-1])
        if area>5:n['conditions'].append('CP-100 only; CP-25 has 2 areas and CP-50 has 5.')
        elif area>2:n['conditions'].append('CP-50 / CP-100 only; CP-25 has 2 areas.')
    if n['parentId']=='program-zone-programming-zone-areas' and n['label'] in ['Area 3','Area 4','Area 5']:
        n['conditions'].append('CP-50 / CP-100 only; CP-25 has 2 areas.')
    if '(CP-50' in n['label']:n['conditions'].append('CP-50 / CP-100 only as labelled by INS008.')
    if n['label'] in ['Simple key fob','Key fob MA 1+2']:
        n['notes'].append('INS008 p47 gives both this and the adjacent user option the number 8. This conflict is retained as a documented ambiguity; no alternative number is invented.')
        n['codeType']='ambiguous'
    if n['parentId'] and n['parentId'].endswith('system-timers') and n['label'].lower()=='beam pair':
        n['notes'].append('The manual lists Beam pair at 09 and again at 27; inspect the actual firmware/help text before identifying the intended timer.')

tests=add('tests','engineer','Tests & Diagnostics',64,
          summary='System tests and diagnostic displays. These commands are indexed as reference; FINDR only simulates the linked practice exercises.')
test_items=[('Test Bell & Strobe',64,'00','command','Test sounders and enabled user outputs.'),('Walk Test Zones',64,'01','command','Observe detector activations during a functional walk test.'),('View Inactive Zones',64,'02','status','Find zones with no recorded activity during a chosen period.'),('View Zone Status',64,'03','status','Read zone state, resistance where supported, counts and last activity.'),('View System Devices',65,'04','status','Inspect panel, keypad, expander and network-sounder diagnostics.'),('Wireless Status',66,'05','status','Read learned wireless-device and key-fob signal, temperature and battery details.'),('View Module Status',66,'06','status','Inspect fitted communications modules.'),('Wi-Fi Status and Checks',67,'07','command','Inspect access points and connection status.'),('Do a Test Call',67,'08','command','Select a reporting event for a communications test.'),('Review Voice Messages',67,'09','command','Review recorded and system messages.'),('Send SMS Message',68,'10','command','Compose a message for a fitted supported communicator.'),('View Debug Trace',68,'11','status','Inspect diagnostic trace entries, separate from the normal event log.'),('Update Device Firmware',68,'12','command','Inspect device versions and the documented update facility.')]
for label,page,code,kind,summary in test_items:
    n=add('tests-'+slug(label),'tests',label,page,code,kind,summary,codeType='menu')
    if label=='Test Bell & Strobe':
        n['practiceTaskIds']=['bell-test']
        for i,s in enumerate(['Bell','Strobe','Speaker','User Outputs','Bell Back Light','Bell Power Off (CP-50, CP-100 only)'],1):
            add(n['id']+'-'+slug(s),n['id'],s,64,str(i),'setting','Documented test control. This is a reference entry, not a live command.',codeType='parameter',conditions=['CP-50 / CP-100 only'] if i==6 else [])
    elif label=='Walk Test Zones':
        n['practiceTaskIds']=['walk-test']
        for s in ['Always chime','New devices chime','Silent','Chime only zone ##']:add(n['id']+'-'+slug(s),n['id'],s,64,kind='selection',summary='Chime mode within the walk-test display.')
    elif label=='View Inactive Zones':
        for s in ['Over 15 minutes','Over 30 minutes','Over 1 Hour','Over 12 hours','Over 1 day','Over 1 week','Over 1 month']:add(n['id']+'-'+slug(s),n['id'],s,64,kind='selection',summary='Activity-window choice within the inactive-zone display.')
    elif label=='View Zone Status':
        n['aliases']=['zone resistance','ohms','resistor','active zone','detector status','activation count'];n['practiceTaskIds']=['zone-resistance']
        for s,pg in [('Status',64),('Reset count',64),('Reset Day',65),('Reset All',65)]:add(n['id']+'-'+slug(s),n['id'],s,pg,kind='selection',summary='Mode selected with left/right inside the zone-status display. Counter reset modes require confirmation; they do not reset an alarm.')
    elif label=='View System Devices':
        for s,pg in [('Panel status',65),('Remote keypad primary status',65),('Remote keypad poll / CRC / cable delay',65),('Remote keypad environmental status',65),('Remote expander primary status',65),('Remote expander poll / CRC / cable delay',65),('Remote expander environmental / power status',66),('External sounder primary status',66),('External sounder poll / CRC / cable delay',66),('External sounder environmental status',66)]:add(n['id']+'-'+slug(s),n['id'],s,pg,kind='reference',summary='Documented diagnostic view inside View System Devices; availability depends on the fitted device.',aliases=['poll errors','crc errors','cable delay'] if 'CRC' in s else [])
    elif label=='View Module Status':
        for s in ['GSM','Wi-Fi','Ethernet','PSTN']:add(n['id']+'-'+slug(s),n['id'],s+' module status',67,kind='reference',summary='Readings available for the named fitted communications module.')
    elif label=='Do a Test Call':
        for s in ['Test Call','Armed','Disarmed','Alarm','Confirmed Alarm','PA','Fire','Arm Failure','Zone Omit','Arm Fail']:add(n['id']+'-'+slug(s),n['id'],s,67,kind='selection',summary='Event name printed in the test-call list. This reference does not send an event.')
        n['notes']=['The manual lists both Arm Failure and Arm Fail. Their relationship requires confirmation; they have not been merged.']
    elif label=='Review Voice Messages':n['notes']=['The paragraph says 10 messages while the selection instruction says 1–15. The available count needs firmware verification.']

add('wireless-setup','engineer','Setup Wireless Zones',69,summary='Learn or identify a wireless device against a selected zone; the device-specific learning procedure is in that device’s installation guide.')
logs=add('event-logs','engineer','System Event Logs',69,summary='Recorded event, mandatory-event and chime history, plus printing.',aliases=['last alarm','history','alarm memory'],notes=['INS008 p30 text calls this shortcut 03, but its screenshot shows 02. This map intentionally withholds a top-level shortcut until firmware is identified.'])
for label,code,summary in [('View event log','00','System events with date/time and area information.'),('View mandatory log','01','Mandatory-event history described by the baseline manual.'),('View chime log','02','Recent zones that chimed.'),('Print log',None,'Serial-printer output of the log through a configured COM port.')]:
    n=add('logs-'+slug(label),'event-logs',label,69,code,'status' if code else 'command',summary,codeType='menu')
    if label=='View event log':
        n['practiceTaskIds']=['event-log']
        for s in ['All Events','Alarms','Tampers','Faults','Open & Close','Tests','Restore','Custom']:add(n['id']+'-'+slug(s),n['id'],s,69,kind='selection',summary='Event-type filter changed with left/right in the log display.')
    if label=='Print log':n['notes']=['The manual prints 02 for both View chime log and Print log on p69. Use the label; the Print log numeric shortcut is unresolved.']

add('chains','engineer','Create / Edit Chains',73,summary='Build an output expression using documented AND / OR logic. A chain can contain up to 20 inputs.',notes=['Omit changes AND/OR for the highlighted output in this context. The same key has other meanings elsewhere.'])
add('confirm-devices','engineer','Confirm Devices',73,summary='Review and confirm the network devices present.',notes=['Highlighted addresses mark new devices; a lower-case x marks a previously confirmed missing device. A numeric address here is a device address, not a menu code.'])
sia=add('event-code-editor','engineer','Edit SIA & ID Codes',73,summary='Event-reporting code and report-group editor.',notes=['The event numbers in the p70–72 tables identify event records. They are not engineer menu shortcuts.'])
for s in ['SIA code','Contact ID code','Report Group','New Event / Restore Event']:add(sia['id']+'-'+slug(s),sia['id'],s,73,kind='setting',summary='Documented field or mode for the selected event record.')
add('event-code-catalogue',sia['id'],'Event code catalogue',70,kind='reference',summary='The manufacturer’s complete event-code tables occupy printed/PDF pages 70–72.',sourceRefs=[dict(sourceId='ins008',printedPage=str(p),pdfPage=p) for p in [70,71,72]])
clock=add('time-date','engineer','Set Time & Date',73,summary='Edit the panel clock and calendar.')
for s in ['Hours','Minutes','Seconds','Days','Months','Years']:add('time-'+slug(s),'time-date',s,73,kind='setting',summary='Field selected with up/down and changed with left/right.')
add('engineer-user-menu','engineer','User menu',73,kind='reference',summary='The installer manual delegates the details to a master user guide. The separately mapped INS023 user guide below covers CP-25 / CP-50 only.')
about=add('about','engineer','About',73,kind='status',summary='Panel and keypad identity, versions, installed modules and resource counts.',aliases=['firmware','software version','panel model','which version'])
for s,pg in [('Keypad and software version',73),('Control panel model and software version',73),('Keypads and expanders connected',73),('Zones in use and maximum',73),('User codes in use',74),('PSTN module fitted',74),('ZX-5C version',74),('Wi-Fi details',74),('Ethernet details',74),('GSM details',74)]:add('about-'+slug(s),'about',s,pg,kind='reference',summary='Information line in the About display; scroll through the list.')
add('exit-menu','engineer','Exit Menu',74,kind='command',summary='Returns to the home screen while the engineer remains on site. This is different from ending engineer access.',aliases=['leave menu','home screen'])
add('log-off','engineer','Log off & exit',30,kind='command',summary='Ends the engineer session.',notes=['INS008 p30 text gives shortcut 11, while its screenshot shows 09. Select by the displayed label until the actual firmware is confirmed.'])

# User procedures remain a separate source/model baseline. Codes are deliberately
# absent: this guide shows menu labels but no trustworthy complete numeric map.
add('user','root-user-placeholder','User menu · INS023 (2017)',12,source='ins023',summary='CP-25 / CP-50 user-menu reference. The guide does not establish the whole user-menu order or CP-100 equivalence.')['parentId']=None
user_items=[('full-arm','Full arm system',13,'command','Sets the permitted areas fully.',[]),('part-arm','Part arm 1 / 2 / 3',14,'command','Selects one of the installed part-setting configurations.',[]),('area-full-arm','Area full arm',16,'command','Choose which permitted areas to set fully.',[]),('area-part-arm','Area part arm',17,'command','Choose permitted areas and a part-setting mode.',[]),('area-disarm','Disarm areas',18,'command','Select which armed areas to unset.',[]),('omit','Omit zones',21,'command','Temporarily excludes eligible zones from alarm monitoring; this does not disconnect or power off a detector.',['disable device','bypass detector','isolate sensor','restore device','reinstate zone','enable zone']),('chime','Turn chime on/off',23,'command','Changes chime for selected areas.',[]),('logs','View System Log',24,'menu','Opens the system’s log choices. The chapter heading calls this System Event Logs.', ['history','last alarm']),('tests','System tests',32,'menu','Opens user tests and diagnostic views.',[]),('code','Change my code',22,'command','Changes the current user’s own passcode.',[]),('settings','Change settings',22,'reference','The menu label is visible in the guide, but its submenu is not described. A matching Master User Guide is needed.',[]),('reset','Reset alarms',19,'command','Requests the reset available to the current user after the cause is addressed.',[]),('exit','Exit menu',22,'command','Returns to the normal home display.',[])]
for ident,label,pg,kind,summary,aliases in user_items:
    n=add('user-'+ident,'user',label,pg,kind=kind,summary=summary,source='ins023',aliases=aliases,notes=['Listed in the reference grouping; full live-menu order depends on state, user permissions and firmware.'])
    if ident=='omit':n['access']='Master or Manager (INS023 p21)';n['practiceTaskIds']=['omit-zone','restore-zone'];n['notes']+=['Up/down selects a zone. Left/right changes its tick/cross omission marker. Back returns to the user menu. -- means the zone is not omittable.','Automatic restoration depends on the installer’s Reinstate on Disarm option.']
for label,page in [('View event log',25),('View mandatory log',25),('View chime log',26),('Print log',26)]:add('user-logs-'+slug(label),'user-logs',label,page,kind='status' if label!='Print log' else 'command',summary='Documented user log option.',source='ins023',conditions=['CP-50 only for printing, per INS023 p26.'] if label=='Print log' else [])
for label,page in [('Test Bell & Strobe',33),('Walk Test Zones',34),('View Inactive Zones',35),('View Zone Status',36),('View Module Status',37),('Do a Test Call',38),('Review Voice Messages',38),('Send SMS Message',39)]:add('user-tests-'+slug(label),'user-tests',label,page,kind='status' if label.startswith('View') else 'command',summary='Documented user test or diagnostic option; availability depends on permissions and fitted equipment.',source='ins023')
quick=add('quick-features',None,'Additional keypad features',40,kind='reference',summary='Optional keypad features reached with left/right from the normal screen, when enabled by the installer.',source='ins023')
for label,alias in [('User Control','Control outputs'),('X10 Control','X10 outputs'),('Alarm Clock','Alarm clock'),('Chime','Turn chime on or off'),('Messages','Review voice messages'),('Send SMS','Send a text message'),('LCD Message','Display LCD message'),('Timer','Countdown timer')]:
    add('quick-'+slug(label),'quick-features',label,40,kind='reference',summary='Optional keypad feature: '+alias+'. Its complete submenu is not specified in this guide.',source='ins023',aliases=[alias])
for n in nodes:
    if n['id']=='quick-features' or n['parentId']=='quick-features':
        n['access']='Installer-enabled home-screen feature; no user code or NFC tag required'
        n['conditions']=['System unset; the feature must be enabled in keypad programming.']
        n['sourceRefs'].append(dict(sourceId='ins008',printedPage='54',pdfPage=54))
        if n['label'] in ['User Control','X10 Control','Chime','Timer']:
            n['notes'].append('INS023 p40 explicitly describes this feature as available without entering a user code.')
    if n['id'] in ['user-logs','user-tests'] or n['parentId'] in ['user-logs','user-tests']:
        n['access']='Master or Manager (INS023 pp24,32)'
    if n['id']=='user-logs':
        n['aliases']+=['System Event Logs','System Event Log']
        n['notes'].append('INS023 p24 says View System Log in the instruction but System Event Logs in the illustration; both names are indexed.')
    if n['id']=='user-area-part-arm':n['label']='Area part arm 1 / 2 / 3'
    if n['id']=='tests-review-voice-messages':
        n['notes'].append('INS023 p38 separately documents 15 messages; this corroborates the selector but does not identify the firmware behind INS008’s differing paragraph.')

gaps=[
 dict(id='firmware',title='Actual panel and firmware baseline',question='Which Orisec control-panel models and software versions should FINDR target? Please provide the About lines for both panel and keypad.',reason='INS008 is a 2018 baseline; the current public range includes other models. The keypad appearance does not determine panel firmware.',priority='high',affectedNodeIds=['engineer','about'],neededEvidence='About display showing panel model/version and keypad version; no passcodes.'),
 dict(id='top-level-order',title='Conflicting engineer shortcuts and top-level order',question='On that firmware, what are the complete engineer-menu labels and numbers, particularly System Event Logs and Log off & exit?',reason='INS008 p30 text says 03 and 11, but the same-page screenshots show 02 and 09. Chapter order cannot resolve the live menu.',priority='high',affectedNodeIds=['engineer','event-logs','log-off'],neededEvidence='A slow scroll or successive photos of the authorised engineer menu with highlighted labels and numbers visible.'),
 dict(id='print-log',title='Duplicate event-log shortcut',question='What number does Print log show in System Event Logs?',reason='INS008 p69 prints 02 beside both View chime log and Print log.',priority='medium',affectedNodeIds=['logs-print-log'],neededEvidence='Photo of the log submenu on a named panel firmware.'),
 dict(id='user-options',title='Duplicate user-option number',question='What are the displayed option numbers for Simple key fob and Key fob MA 1+2?',reason='INS008 p47 prints 8 for both options.',priority='medium',affectedNodeIds=[n['id'] for n in nodes if n['label'] in ['Simple key fob','Key fob MA 1+2']],neededEvidence='User-options screen/help on the target firmware.'),
 dict(id='beam-pair',title='Two Beam pair timers',question='What labels, units and context help are displayed for System Timers 09 and 27?',reason='INS008 pp35–36 lists Beam pair twice; the source alone does not establish whether these are distinct firmware parameters or a documentation error.',priority='medium',affectedNodeIds=[n['id'] for n in nodes if n.get('parentId','') and n['parentId'].endswith('system-timers') and n['label'].lower()=='beam pair'],neededEvidence='Timer 09 and 27 screens and their context-help text.'),
 dict(id='master-user',title='Full master-user settings and newer CP models',question='Can you provide the matching Master User Guide, especially the Change settings submenu, and a current installer manual for the chosen panel version?',reason='INS023 displays Change settings but does not document its tree; CP-100 and newer CP-10/20/60/200 firmware are not established by this CP-25/50 user guide. The public Orisec installer link leads to sign-in.',priority='high',affectedNodeIds=['user-settings','engineer-user-menu'],neededEvidence='Lawfully obtained matching manual PDF or redacted submenu photographs; no account credentials.'),
 dict(id='voice-count',title='Voice-message count mismatch',question='Does Review Voice Messages offer 10 or 15 user messages on the chosen firmware?',reason='INS008 p67 describes 10 messages but its procedure says 1–15.',priority='low',affectedNodeIds=['tests-review-voice-messages'],neededEvidence='The first/last selectable voice-message index or firmware-specific manual.'),
 dict(id='test-events',title='Two similar test-call events',question='Does Do a Test Call contain both Arm Failure and Arm Fail, and how does its help distinguish them?',reason='Both names appear in the INS008 p67 list.',priority='low',affectedNodeIds=['tests-do-a-test-call'],neededEvidence='Test-event list and help text, without sending a test event.'),
 dict(id='cp100-zone-areas',title='CP-100 zone-area list continuation',question='On a CP-100 with the matching firmware, how are Zone Areas 6–10 displayed and selected?',reason='INS008 p32 says CP-100 supports 10 areas, but the detailed Zone Areas enumeration ends at 5 on p33. The missing entries have not been invented.',priority='medium',affectedNodeIds=['program-zone-programming-zone-areas'],neededEvidence='CP-100 Zone Areas selector with area6–10 and panel software version visible.'),
]
sources=[]
for id,name,edition,file,url,scope in [
 ('ins008','CP-25 / CP-50 / CP-100 Installation Manual','INS008, ©2018','orisec-cp25-50-100-installer.pdf','https://www.ukwatchsecurity.co.uk/engineer-manuals/Manuals/Orisec%20CP%2025-50-100%20Install%20Manual.pdf','Legacy CP-25 / CP-50 / CP-100 only. Firmware number is not pinned by the cover.'),
 ('ins023','CP-25 & CP-50 User Guide','INS023, ©2017','user-ins023.pdf','https://www.ukwatchsecurity.co.uk/engineer-manuals/Manuals/Orisec%20CP%2025-50%20User%20Guide.pdf','User procedures for CP-25 / CP-50 only; not a complete master-programming guide.')]:
    data=(pdfdir/file).read_bytes()
    sources.append(dict(id=id,title=name,edition=edition,url=url,publisher='Orisec',totalPdfPages=len(fitz.open(stream=data)),sha256=hashlib.sha256(data).hexdigest(),pageNumbering='Printed page equals one-based PDF page.',scope=scope))
result=dict(schemaVersion=1,profileId='orisec-cp',title='Orisec CP',panelModels=['CP-25','CP-50','CP-100 (installer only)'],keypadModels=['MK-700 style reference'],baseline='Installer INS008 (2018); separate CP-25 / CP-50 user guide INS023 (2017). Firmware version not established.',verifiedAt='2026-10-29',scope='Documented legacy menu structure and parameter/value index, with ambiguous top-level shortcuts withheld. Not an assertion of all current Orisec firmware menus or full emulation.',sources=sources,
 numbering=dict(style='mixed',explanation='Two-digit shortcuts are local to a menu. Programming groups 00–24 and Tests & Diagnostics entries 00–12 are printed explicitly. Parameter and option numbers belong to their own field; they are not global menu addresses.',examples=[dict(code='Programming menu → 00',meaning='Zone Programming group'),dict(code='Tests & Diagnostics → 03',meaning='View Zone Status'),dict(code='Zone Type → 04',meaning='Intruder type value, not menu 04')],caveats=['The manual chapter heading “4. Tests and Diagnostics” is not shortcut 04.','Top-level numbering and order require hardware confirmation because p30 screenshots and text conflict.','Order within field/value lists follows the document; an indexed parameter is not necessarily a separate LCD submenu.']),
 navigation=[dict(keys='Up / Down',action='Move between menu labels.',sourceRefs=[dict(sourceId='ins008',printedPage='30',pdfPage=30)]),dict(keys='Right or Enter',action='Open the highlighted menu.',sourceRefs=[dict(sourceId='ins008',printedPage='30',pdfPage=30)]),dict(keys='Back / Left',action='Return one level in the menu. In editing contexts left may instead change a value; follow the displayed context.',sourceRefs=[dict(sourceId='ins008',printedPage='30',pdfPage=30)]),dict(keys='Help',action='Read context-sensitive help for the highlighted programming item.',sourceRefs=[dict(sourceId='ins008',printedPage='30',pdfPage=30)]),dict(keys='Arm / Part (while programming)',action='Copy / paste the highlighted programming item.',sourceRefs=[dict(sourceId='ins008',printedPage='30',pdfPage=30)])],nodes=nodes,gaps=gaps,
 coverage=dict(strategy='Compared all INS008 programming headings and parameter/value labels across pp31–63, all13 diagnostic entries pp64–68, logs and remaining engineer sections pp69–74, and the INS023 user procedures. PDF diagrams p30/64/69/73 visually reviewed; image-based user guide OCR cross-checked against its displays.',mappedAreas=['25 numbered programming groups (00–24)','Documented field, flag and selection labels under programming groups','13 numbered Tests & Diagnostics options (00–12)','Event/mandatory/chime/print logs and filters','Wireless learning, chains, device confirmation, event-code editor, time/date, About and exit distinctions','Separate CP-25 / CP-50 user routes and optional-feature references'],excludedAreas=['Current/newer CP firmware without a matching manual','Undocumented Master User Change settings tree','Complete event-description table expansion (source pages70–72 are linked)','Full parameter ranges/defaults and electrical installation procedures','Claim of exact live ordering for the whole engineer/user root','Full firmware execution and physical-device validation'],hardwareVerified=False,confidence='Source-specific reference with explicit conflicts and missing evidence; not a zero-error certification.'))
out=root/'public/app/data/menu-maps/orisec-cp.json';out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(result,indent=2,ensure_ascii=False)+'\n')
print(len(nodes),'nodes',len([n for n in nodes if n['parentId']=='programming']),'programming groups',len(gaps),'gaps')
