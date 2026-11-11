"""Write the reviewed Menvier evidence and scope audit; no manual PDF is deployed."""
from pathlib import Path
from collections import Counter
import json

ROOT=Path(__file__).resolve().parents[2]
atlas=json.loads((ROOT/'public/app/data/menu-maps/menvier-mseries.json').read_text())
profile=json.loads((ROOT/'research/expansion/menvier-profile.json').read_text())
def ref(page,source='eng5'):
    return {'sourceId':source,'printedPage':str(page),'pdfPage':page+2}
sources=[]
for source,size,filename in zip(atlas['sources'],[1266950,311359,296960],['engineering.pdf','manager.pdf','user.pdf']):
    sources.append({**source,'bytes':size,'downloadedAt':'2026-10-29','sourceKind':'Original manufacturer-authored PDF hosted by an installer archive','reviewCopy':'/tmp/menvier-source/'+filename,'publishedAsset':False})

audit={
 'schemaVersion':1,'profileId':'menvier-mseries','reviewedAt':'2026-10-29',
 'result':'Source-pinned broad M Series emulator with seven working lessons and disclosed implementation boundaries; not a complete or physically verified firmware reproduction.',
 'baseline':{
   'engineer':'M750/M800 subset of Cooper Security M-Series Engineering Manual 496966 Issue 5, copyright 2005–2006.',
   'manager':'Separate M800 subset of M2000/M800 Manager’s Manual, part 11821957. PDF metadata created 2010-01-21, modified 2010-02-09. No matching firmware number is asserted.',
   'keypad':'Classic M Series LCD face from M2000/M800 User’s Guide 12062453, printed p3 / PDF p5. This guide is used for the face and physical key names only.',
   'notApplicable':['Menvier30/40/100/300','TS500/TS700/TS800/TS900','M800iD Plus-only biscuits','M1000-only RS232 baud editor','M2000 capacities'],
   'modelChoiceReason':'A complete, public, manufacturer-authored older M Series engineering source was available. A modern Menvier30/40/100/300 engineering baseline was not established; its menu was not guessed.',
 },
 'sources':sources,
 'reproducibility':{
   'sourceIdentity':'SHA-256 is checked if the original review PDFs are present. The generator otherwise uses the reviewed pinned hashes; changing a local source PDF fails the rebuild until it is reviewed.',
   'commands':['python research/expansion/build-menvier.py','python research/expansion/build-menvier-profile.py','python research/expansion/build-menvier-audit.py','node --test tests/emulator-menvier.test.mjs'],
   'pdfExtraction':'pdftotext -layout; one-based PDF page = printed Arabic page + 2 for all three pinned PDFs.',
   'sourceFilesDeployed':False,
 },
 'keypad':{
   'sourceRefs':[ref(3,'keypad')],
   'rows':[['previous','1','2','3'],['change','4','5','6'],['next','7','8','9'],['details','enter','0','back']],
   'labels':{'previous':'up arrow','change':'toggle symbol','next':'down arrow','details':'#','enter':'ENT','back':'ESC'},
   'visualNotes':'Function column at the left of the recessed key bank. ENT green; ESC and Toggle red. The face is a code-drawn style reference, not a manufacturer photograph.',
 },
 'verifiedNavigation':[
   {'fact':'Local numeric hotkey then ENT at each level; dotted addresses identify the path, not a single root shortcut.','sourceRefs':[ref(22),ref(2,'manager2010')]},
   {'fact':'Zone programming proceeds through four-digit zone selection, type, attribute list, ward mask and description. ENT accepts each stage; ESC returns.','sourceRefs':[ref(24),ref(25),ref(32)]},
   {'fact':'Attribute digits 1–9 select the named attribute; the physical Toggle key changes Yes/No. Numeric ward keys toggle the ward mask.','sourceRefs':[ref(24),ref(30),ref(32),ref(126)]},
   {'fact':'Zone descriptions are 16 characters. The helper edits text; physical multi-tap timing and cursor behavior are not implemented.','sourceRefs':[ref(32),ref(123)]},
   {'fact':'M800 Omit Zones accepts a four-digit eligible zone, Toggle changes its omission, ENT advances and ESC exits. Ordinary omission is reinstated when the ward is unset.','sourceRefs':[ref(7,'manager2010')]},
   {'fact':'View Zones and Zone Resistance are different routes. The latter is Engineer 2 → 7 Built In Tests → 3 Equipment → 4 Zone Resistance.','sourceRefs':[ref(83),ref(108)]},
   {'fact':'The dedicated resistance display shows ohms immediately. A healthy 4K7/2K2 FSL loop is 2.2 kΩ; active is 6.9 kΩ; an open panel input reads 11.463 kΩ.','sourceRefs':[ref(83),ref(108)]},
   {'fact':'Up selects earlier log events; Toggle displays associated text. # is not substituted for that control.','sourceRefs':[ref(116),ref(36,'manager2010')]},
   {'fact':'M750/M800 physical panel-output testing uses outputs 1, 3 and 4.','sourceRefs':[ref(103)]},
   {'fact':'M800 Manager Edit Codes has 1 Code, 2 User Name, 3 Customise Menus and 4 Telecommands. Shunt, Set Only and Not in use have no user-type hotkey.','sourceRefs':[ref(23,'manager2010'),ref(24,'manager2010'),ref(26,'manager2010'),ref(27,'manager2010'),ref(28,'manager2010')]},
 ],
 'sourceDiscrepancies':[
   {'issue':'The engineer PDF metadata title mentions issue4a; its printed back cover identifies 496966 Issue 5.','resolution':'Use the printed document identity and pin its hash.'},
   {'issue':'The older Time Switch prose says up to three, but its diagram mentions keys 1–4.','resolution':'Three training records; discrepancy exposed as a gap.','sourceRefs':[ref(62)]},
   {'issue':'AC Bypass wording differs between a heading and its explanatory choices.','resolution':'Use Always / Healthy / Never, also confirmed in the compact quick reference.','sourceRefs':[ref(81),ref(127)]},
   {'issue':'Custom-output prose initially says four gates but then describes gates 1–8 and draws eight.','resolution':'Map four OR and four AND gates; executable gate logic remains reference-only.','sourceRefs':[ref(40),ref(41)]},
   {'issue':'Power Supply quick reference lists six fields; the body documents 7 Source Current.','resolution':'Retain all seven body-documented fields.','sourceRefs':[ref(102),ref(128)]},
   {'issue':'Test Display quick reference points to p110, but its body is on p114.','resolution':'The map cites printed p114 / PDF p116.','sourceRefs':[ref(114),ref(128)]},
   {'issue':'Later Auto-Set example selector is broader than the explicitly stated M800 capacity.','resolution':'Use the model-specific p39 capacity: eight M800 auto-sets, five time switches, thirty exceptions.','sourceRefs':[ref(39,'manager2010'),ref(43,'manager2010')]},
   {'issue':'Manager Engineer Access names four windows and hotkeys 1–4, without showing the exact number-to-label mapping.','resolution':'Choices scroll by verified labels. No number assignment is invented.','sourceRefs':[ref(14,'manager2010')]},
   {'issue':'The final Code Locks field in the code-user sequence explicitly ends with ESC.','resolution':'The unresolved final save/exit transition is a reference screen. The separate Code Locks allocation mask is available with its simplification disclosed.','sourceRefs':[ref(26,'manager2010'),ref(49,'manager2010'),ref(51,'manager2010')]},
 ],
 'coverage':{
   'documentedAtlasEntries':len(atlas['nodes']),
   'rawNodeKinds':dict(Counter(node['kind'] for node in atlas['nodes'])),
   'reachableEmulatorScreens':353,'menus':62,'editableFields':232,'actionsStatusesTests':44,'referenceOnlyScreens':15,
   'guidedTasks':len(profile['tasks']),'sourceGaps':len(atlas['gaps']),
   'countMeaning':'Atlas entries include selectable values. They are not all separate screens. Repeated hardware instances are fixture records, not additional screen counts.',
   'included':atlas['coverage']['mappedAreas'],
   'lessonIds':[task['id'] for task in profile['tasks']],
   'hardwareVerified':False,
 },
 'implementedBehaviors':[
   'Per-menu numeric navigation and arrows, plus physical ENT/ESC.',
   'Zone record selection and immediate type → attributes → wards → description sequence.',
   'ENT advance without synthetic writes when unchanged; ESC discards a draft and steps back.',
   'Saved configuration values, per-record state, local fictional history and persistent state supported by the shared engine.',
   'Deferred engineer commit and immediate accepted manager edits in separate roots.',
   'M800 ordinary omission/reinstatement and documented ENT next-zone behavior.',
   'Separate status and immediate resistance screens, fictional input activation, and log direction/details controls.',
   'Numeric physical-output tests, automatic output stop on leaving the screen, local report preparation.',
   'Independent older and later timer record scopes; exact model capacities where stated.',
   'SHOW HINTS routes that only highlight physical buttons and stop before saving or executing an operation.',
 ],
 'explicitSimplifications':[
   'There is no physical panel, radio, modem, ARC, downloader, printer or electrical connection.',
   'Free-text entry uses a helper with ENT save and ESC cancel. The original multi-tap table is retained below for follow-up.',
   'Unverified text, telephone, account and older timer/volume bounds are labelled as training bounds.',
   'Output source catalogues are editable, but conditional wizard order, pulse duration and live gate/output logic are not a full firmware implementation.',
   'The four detector fixtures retain their stated 4K7/2K2 readings when a different resistor configuration value is stored.',
   'Manager Bell Test uses individual output toggles; Ward 1 walk testing has a fixed fixture and simplified result review.',
   'Calendar exception/user allocations are consolidated masks; physical per-record No/Yes acceptance and actual timed execution are not reproduced.',
   'The date helper combines day/month entry where the physical calendar prompt separates them.',
   'No radio enrolment, NVM defaulting, credential defaulting or complex false-setting behavior is invented.',
   'Numeric event filters, log offsets, remote network jumps and digital output bank switching are not implemented.',
 ],
 'textKeysForFutureImplementation':{
   'sourceRefs':[ref(123),ref(52,'manager2010')],
   'implemented':False,
   'characterTable':{'1':['.',',','?','!','1','@','"','-','&',"'"], '2':list('ABC2abc'),'3':list('DEF3def'),'4':list('GHI4ghi'),'5':list('JKL5jkl'),'6':list('MNO6mno'),'7':list('PQRS7pqrs'),'8':list('TUV8tuv'),'9':list('WXYZ9wxyz'),'0':[' ','0',',','#','*']},
   'documentedCursorRule':'After choosing a character, up moves the cursor right and down moves it left; repeated presses cycle the current key’s table. No implicit timing timeout is asserted.',
 },
 'qa':{
   'familyCommand':'node --test tests/emulator-menvier.test.mjs','familyCases':10,'familyCasesPassed':10,
   'graphValidationErrors':[],
   'checked':['Pinned PDF hashes and page offsets','Physical keypad row order','Edition and model separation','Numeric path 2.7.3.4','Dedicated immediate resistance readout','Sequential edit/ESC/commit','Attribute digit selection versus Toggle','Omission and record advance','Log direction and detail control','M750/M800 output numbers','Manager submenus and timer capacities','No-saving hint paths','All seven guided lessons'],
   'sharedIntegration':'Root owns profile merge, browser/mobile checks, shared regression suite and publication.',
   'physicalTesting':'Not performed. A matching model/firmware display and captured boundary flows remain necessary to claim firmware parity.',
 },
 'followUpQuestions':atlas['gaps'],
}
(ROOT/'research/expansion/menvier-audit.json').write_text(json.dumps(audit,indent=2,ensure_ascii=False)+'\n')
print('Menvier evidence audit:',len(sources),'pinned sources;',len(atlas['gaps']),'explicit gaps')
