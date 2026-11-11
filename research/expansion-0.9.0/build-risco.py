"""Build the source-pinned LightSYS2 atlas. Inputs are original RISCO PDFs.

The quick-key extraction is a review aid. Corrections, conditional branches and
behavior declarations below are deliberately explicit. No factory credentials
or manufacturer prose are copied into the product.
"""
import json, re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'research/expansion-0.9.0'
OUT = ROOT / 'public/app/data/menu-maps/risco-lightsys2.json'
sources = [
 {'id':'installer-g','title':'LightSYS2 Installation and Programming Manual','edition':'5IN2048 G · 06/2020','url':'https://www.lsc.com.au/Documents/LightSYS2%20Installer%20Manual%20EN.pdf','publisher':'RISCO Group (original manufacturer document; LSC mirror)','totalPdfPages':272,'sha256':'d686a09823279da50e3c9fc307a88576742220a6bb093e52f09928b1e79ffdd1','pageNumbering':'The cited printed Arabic page equals the one-based PDF page.','scope':'LightSYS2 installer baseline; feature-dependent menus. Not LightSYS+.'},
 {'id':'user-uk-e','title':'LightSYS2 User Manual — UK','edition':'5IN2124 E · 08/2021','url':'https://riscogroup.com/en/downloads-material/21659/','publisher':'RISCO Group','totalPdfPages':60,'sha256':'3325de4e12edec037c7c1243a438f28f0f30134770aa0b1668849038e2b5fdfa','pageNumbering':'The cited printed Arabic page equals the one-based PDF page.','scope':'Separate later UK user terminology and menu baseline. This does not assert identical firmware to installer G.'},
 {'id':'keypad-h','title':'LCD Keypad & LCD Proximity Keypad — RP432KP / RP432KPP','edition':'5IN1425 H · PDF metadata created January 2022 · six-page English extract','url':'https://www.maxwell.co.th/wp-content/uploads/2023/11/LightSYS-LCD-Keypad.pdf','publisher':'RISCO Group (original manufacturer document; Maxwell mirror)','totalPdfPages':6,'sha256':'4b703bed3d22383a73bbbcb4aeb7af96ff85b5db78137a760e1fc504c276e6fd','pageNumbering':'The available PDF is the six-page English portion. Printed page equals one-based PDF page; control instructions pp3–6.','scope':'Physical RP432KP / RP432KPP control functions. Other keypad styles remain separate. Revision H is identified in PDF title/metadata; the multilingual remainder is not included in this download.'}
]
nodes=[]; by={}; paths={}
def ref(page,source='installer-g'):
 return {'sourceId':source,'printedPage':str(page),'pdfPage':int(page)}
def add(id,parent,label,page,code=None,kind='menu',source='installer-g',**kw):
 n={'id':id,'parentId':parent,'order':len([x for x in nodes if x['parentId']==parent])+1,'label':label,'code':code,'codeType':'value' if kind=='selection' else 'parameter' if kind=='setting' else 'menu','kind':kind,'summary':kw.pop('summary','Documented '+label+' entry.'),'sourceRefs':[ref(page,source)],**kw}
 nodes.append(n);by[id]=n;return n
def eng(path,label,page,kind='menu',**kw):
 bits=path.split('.');parent='r-installer' if len(bits)==1 else 'r-e'+'.'.join(bits[:-1]);id='r-e'+path
 n=add(id,parent,label,page,bits[-1],kind,**kw)
 if kind not in ['selection','reference']:n['address']=path
 paths[''.join(bits)]=path;return n
def sim(id,mode,**kw):by[id]['simulation']={'mode':mode,**kw};return by[id]
def choices(id,labels,page,codes=None,values=None,source='installer-g',**kw):
 n=by[id];n['kind']='setting';n['codeType']='parameter'
 vals=[]
 for i,label in enumerate(labels):
  code=(codes[i] if codes is not None else None)
  child=add(id+'-v'+str(i+1),id,label,page,code,'selection',source)
  vals.append({'id':child['id'],'label':label,'code':code,'value':values[i] if values is not None else label})
 sim(id,'choice',choices=vals,defaultValue=vals[0]['value'],numericSelection=codes is not None,**kw)
def boolean(id,page,default=False,**kw):
 choices(id,['No','Yes'],page,values=[False,True],**kw);by[id]['simulation']['defaultValue']=default
def number(id,page,lo,hi,value,units='',**kw):
 by[id]['kind']='setting';by[id]['codeType']='parameter';by[id]['sourceRefs']=[ref(page)]
 sim(id,'number',min=lo,max=hi,defaultValue=value,units=units,**kw)
def textfield(id,page,length=16,default='Demo',**kw):
 by[id]['kind']='setting';by[id]['codeType']='parameter';by[id]['sourceRefs']=[ref(page)]
 sim(id,'text',maxLength=length,defaultValue=default,evidenceNote='FINDR text helper replaces the source keypad multi-tap entry; the saved value is fictional.',**kw)

add('r-installer',None,'Installer Programming',74,source='installer-g',summary='Already-authorised installer programming context, pinned to revision G (2020).')
for path,label,page in [('1','System',74),('2','Zones',101),('3','Outputs',135),('4','Codes',148),('5','Communication',152),('6','Audio',187),('7','Install',191),('8','Devices',208),('0','Exit',73)]:eng(path,label,page)

# Curated explicit tree. The detailed parameter table takes precedence over the
# compact appendix where their labels/numbers differ.
tree = '''
1.1|Timers|75
1.1.01|Exit/Entry Delay 1|75
1.1.01.1|Entry Delay 1|75
1.1.01.2|Exit Delay 1|75
1.1.02|Exit/Entry Delay 2|75
1.1.02.1|Entry Delay 2|75
1.1.02.2|Exit Delay 2|75
1.1.03|Bell Timeout|75
1.1.04|Bell Delay|75
1.1.05|Switch Aux Break|76
1.1.06|Wireless|76
1.1.06.1|Jamming Time|76
1.1.06.2|RX Supervise|76
1.1.06.3|TX Supervise|77
1.1.06.4|Service Mode|77
1.1.07|AC Off Delay|77
1.1.08|Guard Delay|77
1.1.09|Swinger Limit|77
1.1.10|Redial Wait|78
1.1.11|Last Exit Sound|78
1.1.12|Buzzer at Stay|78
1.1.13|Status Timer|78
1.1.14|Service Timer|78
1.1.15|Payment Timer|78
1.1.16|Pulse Open|79
1.1.17|Inactivity Timer|79
1.2|Controls|79
1.2.1|Basic|79
1.2.2|Advanced|82
1.2.3|Communication|89
1.2.4|EN 50131|90
1.2.5|PD6662|92
1.2.6|CP-01|94
1.2.7|Device|94
1.3|Labels|96
1.3.1|System|96
1.3.2|Partition 1|96
1.3.3|Partition 2|96
1.3.4|Partition 3|96
1.3.5|Partition 4|96
1.4|Sounds|96
1.4.1|Tamper Sound|96
1.4.1.1|During Disarm|97
1.4.1.2|During Arm|97
1.4.2|Speaker Volume|97
1.4.2.1|Trouble|97
1.4.2.2|Chime|97
1.4.2.3|Exit/Entry|97
1.4.2.4|Alarm|97
1.4.2.5|Squawk|97
1.4.3|Wireless Lost Sound|98
1.5|Settings|98
1.5.1|DIP 2|98
1.5.2|Default Panel|98
1.5.3|Erase Wireless|98
1.5.4|Standard|99
1.5.5|Customer|99
1.5.6|Language|99
1.6|Automatic Clock|99
1.6.1|Server|99
1.6.2|Host|99
1.6.3|Port|100
1.6.4|Time Zone (GMT)|100
1.7|Service Information|100
1.7.1|Name|100
1.7.2|Phone|100
1.8|Firmware Update|100
1.8.1|Server IP|100
1.8.2|Server Port|100
1.8.3|File Name|101
1.8.4|Download File|101
2.1|Parameters|101
2.1.1|One By One|102
2.1.2|By Category|103
2.1.2.1|Label|103
2.1.2.2|Partition|103
2.1.2.3|Type|104
2.1.2.4|Sound|104
2.1.2.4.1|At Arm|114
2.1.2.4.2|At Stay|114
2.1.2.4.3|At Disarm|114
2.1.2.5|Termination|115
2.1.2.6|Loop Response|115
2.1.2.7|Advanced|116
2.1.2.7.1|Forced Arming|116
2.1.2.7.2|Pulsed Counter|116
2.1.2.7.3|Abort Alarm|116
2.1.2.7.4|Bus Zones Configuration|117
2.1.2.7.5|Wireless Zones Configuration|126
2.1.3|Resistance|130
2.2|Testing|131
2.2.1|Self Test|131
2.2.2|Soak Test|131
2.3|Cross Zones|132
2.4|Alarm confirm|135
2.4.1|Confirm partition|135
2.4.2|Confirm zones|135
3.0|Nothing|136
3.1|Follow System|136
3.2|Follow Partition|139
3.3|Follow Zone|144
3.4|Follow Code|145
4.1|User|148
4.1.1|Partition|149
4.1.2|Authority Level|149
4.2|Grand Master|150
4.3|Installer|151
4.4|Sub Installer|151
4.5|Code Length|151
5.1|Method|152
5.1.1|PSTN|152
5.1.1.1|Timers|152
5.1.1.1.1|PSTN Lost Delay|152
5.1.1.1.2|Wait for Dial Tone|153
5.1.1.2|Control|153
5.1.1.2.1|Alarm Phone Line Cut|153
5.1.1.2.2|Answering Machine Override|153
5.1.1.3|Parameters|153
5.1.1.3.1|Dial Method|153
5.1.1.3.2|Rings To Answer|154
5.1.1.3.3|Area Code|154
5.1.1.3.4|PBX Prefix|154
5.1.1.3.5|Call Wait|154
5.1.2|GSM|154
5.1.2.1|Timers|154
5.1.2.1.1|Low RSSI GSM|155
5.1.2.1.2|GSM Network Loss|155
5.1.2.1.3|SIM Expire|155
5.1.2.1.4|MS Polling|155
5.1.2.2|GPRS|157
5.1.2.2.1|APN Code|157
5.1.2.2.2|APN User Name|157
5.1.2.2.3|APN Password|157
5.1.2.3|Email|157
5.1.2.3.1|Mail Host|157
5.1.2.3.2|SMTP Port|158
5.1.2.3.3|Email Address|158
5.1.2.3.4|SMTP User Name|158
5.1.2.3.5|SMTP Password|158
5.1.2.4|Controls|158
5.1.2.4.1|Caller ID|158
5.1.2.4.2|LED Enable|158
5.1.2.5|Parameters|158
5.1.2.5.1|PIN Code|159
5.1.2.5.2|SIM Number|159
5.1.2.5.3|SMS Center Phone|159
5.1.2.5.4|GSM Network Sensitivity (RSSI)|159
5.1.2.6|Prepay SIM|159
5.1.2.6.1|Get Credit by|159
5.1.2.6.2|Phone To Send|160
5.1.2.6.3|Phone To Receive|160
5.1.2.6.4|SMS Message|160
5.1.3|IP|160
5.1.3.1|IP Config|160
5.1.3.1.1|Obtain Automatic IP|160
5.1.3.1.2|Panel Port|160
5.1.3.1.3|Panel IP|161
5.1.3.1.4|Subnet Mask|161
5.1.3.1.5|Gateway|161
5.1.3.1.6|DNS Primary|161
5.1.3.1.7|DNS Secondary|161
5.1.3.2|Email|161
5.1.3.2.1|Mail Host|161
5.1.3.2.2|SMTP Port|161
5.1.3.2.3|Email Address|161
5.1.3.2.4|SMTP User Name|161
5.1.3.2.5|SMTP Password|161
5.1.3.3|Host Name|162
5.1.3.4|MS Keep alive (Polling)|162
5.1.3.5|Controls|163
5.1.3.5.1|LED Enable|163
5.1.4|LRT (Long Range Transmission)|164
5.1.4.1|Account|164
5.1.4.2|System|164
5.1.4.3|Periodic Test|165
5.1.4.4|No. Comm. Parameter|165
5.1.4.5|Control|165
5.1.4.5.1|Disable Low Battery|165
5.2|Monitoring Station|165
5.2.1|Report Type|165
5.2.1.1|Voice|167
5.2.1.2|IP|167
5.2.1.3|SMS|168
5.2.1.4|LRT|168
5.2.1.5|SIA IP|169
5.2.2|Accounts|258
5.2.3|Communications Format|169
5.2.4|Controls|169
5.2.4.1|Call Save|170
5.2.4.2|Show Kissoff|170
5.2.4.3|Show Handshake|170
5.2.4.4|Audible Kissoff|170
5.2.4.5|SIA Text|170
5.2.4.6|Random MS Testing|170
5.2.4.7|SIA with Partition|171
5.2.5|Parameters|171
5.2.5.1|MS Retries|171
5.2.5.2|Alarm Restore|171
5.2.5.3|SIA IP Parameters|171
5.2.6|MS Timers|172
5.2.6.1|Periodic Test|172
5.2.6.2|Abort Alarm|173
5.2.6.3|Cancel Delay|173
5.2.6.4|Listen In|173
5.2.6.5|Confirmation|173
5.2.6.5.1|Confirm Start|173
5.2.6.5.2|Confirm Time Window|173
5.2.7|Report Split|174
5.2.7.1|MS Arm/Disarm|174
5.2.7.2|MS Urgent|174
5.2.7.3|MS Non Urgent|175
5.2.8|Report Codes|176
5.3|Configuration SW|176
5.3.1|Security|176
5.3.1.1|Access Code|177
5.3.1.2|Remote ID|177
5.3.1.3|MS Lock|177
5.3.2|Call Back Phones|178
5.3.3|Control|178
5.3.3.1|Call Back|178
5.3.3.2|User Initiated Call|178
5.3.4|IP Gateway|179
5.4|Follow Me|179
5.4.1|Define FM|179
5.4.1.1|Report Type|179
5.4.1.1.1|Voice|180
5.4.1.1.2|Email|181
5.4.1.1.3|SMS|181
5.4.1.2|Partition|181
5.4.1.3|Events|181
5.4.1.4|Restore Events|183
5.4.1.5|Remote Control|185
5.4.1.5.1|Remote Listen|185
5.4.1.5.2|Remote Program|185
5.4.2|Controls|185
5.4.2.1|Disarm Stop Follow Me|185
5.4.2.2|Disable Report at Stay|185
5.4.3|Parameters|185
5.4.3.1|Follow Me Retries|185
5.4.3.2|Voice Message Recurrence|185
5.4.3.3|Follow Me Periodic Test|186
5.5|Cloud|186
5.5.1|IP Address|186
5.5.2|IP Port|186
5.5.3|Password|186
5.5.4|Channel|186
5.5.5|Controls|187
6.1|Messages|188
6.1.1|Common Message|188
6.1.2|Zone Message|189
6.1.3|Partition Message|189
6.1.4|Utility Output|189
6.1.5|Macro|189
6.1.6|Library Message|189
6.2|Local Announcements|189
7.1|Bus Device|191
7.1.1|Automatic|191
7.1.2|Manual|192
7.1.2.01|Keypad|192
7.1.2.02|Zone Expander|194
7.1.2.03|Utility Output|195
7.1.2.04|Power Supply|196
7.1.2.05|Wireless Expander|197
7.1.2.06|Proximity Key Reader|197
7.1.2.07|Voice Module|199
7.1.2.08|Sounder|199
7.1.2.09|BUS Zones|200
7.1.2.10|GSM|201
7.1.2.11|IP|202
7.1.2.12|Modem|202
7.1.2.13|Bus Expander|203
7.1.2.14|LRT|203
7.1.2.15|COB|203
7.1.3|Testing|204
7.1.3.1|Bus Test|204
7.1.3.2|Bus Scan|204
7.1.3.3|Verify Module|205
7.2|Wireless Devices|205
7.2.1|RX Calibration|206
7.2.2|Allocation|207
7.2.2.1|By RF|207
7.2.2.2|By Code|208
7.2.3|Delete|208
8.1|Keypad|208
8.2|Keyfob|210
8.3|Sounder|211
8.3.1|Parameters|211
8.3.2|Lamp Times|216
8.4|Proximity Key Reader|217
8.5|3A Power Supply|218
'''
for row in tree.strip().splitlines():
 path,label,page=row.split('|');eng(path,label,int(page))

# Controls: all are individually evidenced boolean fields; exact source pages
# are taken from the quick-key table, not guessed from the appendix.
corrections={'12109':'Buzzer → Bell','12112':'Forced Keyswitch Arming','12201':'Double Verification of Fire Alarms','12215':'Disable Incoming Calls','12216':'Disable Keypad When Auto Disarm','12219':'Confirmation Speaker','12228':'Display System Label','1231':'Monitoring Station Enable','1272':'Proximity Anti Mask = Tamper','1273':'Audible Proximity Tamper'}
for row in (SRC/'risco-controls.tsv').read_text().splitlines():
 p,code,label=row.split('\t',2)
 if not re.fullmatch(r'12[1-7](?:\d{2}|\d)',code):continue
 group=code[:3];local=code[3:]
 if (group in ['121','122'] and len(local)!=2) or (group not in ['121','122'] and len(local)!=1):continue
 path=f'1.2.{group[2]}.{local}'
 if 'r-e'+path in by:continue
 eng(path,corrections.get(code,label),int(p),'setting')
 boolean('r-e'+path,int(p))

for path,lo,hi,v,u,p in [
 ('1.1.01.1',1,255,25,'seconds',75),('1.1.01.2',1,255,40,'seconds',75),('1.1.02.1',1,255,35,'seconds',75),('1.1.02.2',1,255,50,'seconds',75),
 ('1.1.03',1,90,3,'minutes',75),('1.1.04',0,90,0,'minutes / seconds — source-dependent',75),('1.1.05',0,90,8,'seconds',76),
 ('1.1.06.2',0,7,4,'hours',76),('1.1.06.3',1,255,60,'minutes',77),('1.1.06.4',1,255,25,'minutes',77),
 ('1.1.07',0,255,20,'minutes',77),('1.1.08',1,99,25,'minutes',77),('1.1.09',0,15,0,'times',77),('1.1.10',0,255,20,'seconds',78),('1.1.11',1,255,8,'seconds',78),('1.1.12',1,99,12,'seconds',78),('1.1.13',0,255,0,'seconds',78),('1.1.14',0,255,0,'weeks',78),('1.1.15',0,255,0,'weeks',78),
 ('5.1.1.1.1',0,20,4,'minutes',152),('5.1.1.1.2',0,255,4,'seconds',153),('5.1.1.3.2',1,15,10,'rings',154)]:number('r-e'+path,p,lo,hi,v,u)
choices('r-e1.1.06.1',['NONE','10 SEC','20 SEC','30 SEC'],76,['1','2','3','4'])
for i in range(1,6):textfield('r-e1.3.'+str(i),96,16,'FINDR demo' if i==1 else 'Partition '+str(i-1))
for i in [1,2]:choices('r-e1.4.1.'+str(i),['Silent','Bell','Buzzer (main)','Bell + Buzzer'],97,['1','2','3','4'])
choices('r-e1.4.3',['As trouble','As tamper'],98,['1','2'])
choices('r-e1.6.1',['NTP','DAYTIME'],99,['1','2'])
textfield('r-e1.6.2',99,32,'time.example.invalid')
textfield('r-e1.7.1',100,16,'Demo installer')
textfield('r-e1.7.2',100,16,'02000000000',textMode='digits')
for i in ['1.5.1','1.5.2','1.5.3','1.8.4']:
 sim('r-e'+i,'info',evidenceNote='Documented hardware/service procedure. FINDR does not simulate a factory reset, erase installed devices, operate a DIP switch or download firmware.')
for path in ['1.1.16','1.1.17','1.4.2.1','1.4.2.2','1.4.2.3','1.4.2.4','1.4.2.5','1.5.4','1.5.5','1.5.6','1.6.3','1.6.4','1.8.1','1.8.2','1.8.3']:
 sim('r-e'+path,'info',evidenceNote='Menu and source location verified; this field is reference-only until its complete entry format and conditional behavior are modelled.')
number('r-e1.1.16',79,0,255,0,'seconds')
number('r-e1.1.17',79,0,255,0,'minutes')
for i in range(1,6):number('r-e1.4.2.'+str(i),97,0,9,5,'volume level',evidenceNote='Fictional stored level; original sounder waveforms and loudness are not reproduced.')
for i,label in enumerate(['EN 50131','PD6662','CP01'],1):add('r-standard-'+str(i),'r-e1.5.4',label,99,str(i),'selection')
for i,label in enumerate(['Text','Voice'],1):add('r-language-'+str(i),'r-e1.5.6',label,99,str(i),'reference')
for i,label in enumerate(['Via IP','Via GPRS/3G/4G'],1):add('r-download-'+str(i),'r-e1.8.4',label,101,str(i),'selection')

# Category-based zone programming shares values with the fictional detector bank.
zone_types=['Not Used','Exit/Entry 1','Exit/Entry 2','Exit (OP)/Entry 1','Exit (OP)/Entry 2','Entry Follower','Instant','I+ Exit/Entry 1','I+ Exit/Entry 2','I+ Exit(OP)/Entry 1','I+ Exit(OP)/Entry 2','I+ Entry Follow','I+ Instant','UO Trigger','Day','24 Hours','Fire','Panic','Special','Pulsed Key Switch','Final Exit','Latch Keyswitch','Entry Follower + Stay','Pulsed Keyswitch Delay','Latch Keyswitch Delay','Tamper','Technical','Water','Gas','CO','Exit Term','High Temperature','Low Temperature','Key Box','KeySwitch Arm','KeySwitch Delayed Arm']
zone_pages=[107]*5+[108]*5+[109]*4+[110]*3+[111]*5+[112]*5+[113]*8+[114]
choices('r-e2.1.2.3',zone_types,107,[str(i).zfill(2) for i in range(36)],selector='zone',scope='zone',bind='zoneType')
by['r-e2.1.2.3']['simulation']['defaultValue']='Instant'
for i,p in enumerate(zone_pages):by['r-e2.1.2.3-v'+str(i+1)]['sourceRefs']=[ref(p)]
textfield('r-e2.1.2.1',103,16,'',selector='zone',scope='zone',bind='zoneName')
sim('r-e2.1.2.2','flags',selector='zone',scope='zone',bind='zoneAreas',choices=[{'id':str(i),'label':'Partition '+str(i),'code':str(i),'value':str(i)} for i in range(1,5)],defaultValue={'1':True,'2':False,'3':False,'4':False},evidenceNote='Partition assignment is interactive. The subsequent unnumbered Group step is separately documented in this atlas.')
add('r-zone-groups','r-e2.1.2.2','Group',103,None,'reference',summary='The partition category continues into group flags A–D; no extra local menu number is given.',simulation={'mode':'info','include':True,'evidenceNote':'Documented continuation; group editing is not merged with partition flags.'})
for i in [1,2,3]:choices('r-e2.1.2.4.'+str(i),['Silent','Bell Only','Buzzer Only','Bell + Buzzer','Door Chime'],114,None,selector='zone',scope='zone')
choices('r-e2.1.2.5',['N/C','EOL','DEOL','N/O','TEOL'],115,['01','02','03','04','05'],selector='zone',scope='zone')
choices('r-e2.1.2.6',['Normal: 400 ms','Long: 1 second','Fast: 10 ms','Extra Fast: 1 ms'],115,['1','2','3','4'],selector='zone',scope='zone')
boolean('r-e2.1.2.7.1',116,selector='zone',scope='zone')
choices('r-e2.1.2.7.3',['ENABLE','DISABLE'],116,['1','2'],selector='zone',scope='zone')
number('r-e2.1.2.7.2',116,1,15,1,'pulses',selector='zone',scope='zone')
sim('r-e2.1.1','info',evidenceNote='The source requires completing the entire One By One sequence before recording changes. This wizard is reference-only; use the independently documented By Category fields for functional edits.')
for label in ['Zone Label','Zone Partitions','Zone Group','Zone Type','Zone Sound — Arm, Stay, Disarm','Zone Termination','Zone Loop Response']:
 add('r-one-'+str(len(nodes)),'r-e2.1.1',label,102,None,'reference',summary='Unnumbered step of the source One By One wizard; not an invented submenu.')
sim('r-e2.1.3','info',evidenceNote='This is end-of-line resistor configuration, not the resistance diagnostic. The installer Maintenance → Zone Resistance screen provides fictional live readings.')
sim('r-e2.2.1','info',evidenceNote='Automated sensor test requires a physical noise/vibration source and configured output; no synthetic successful hardware result is claimed.')
sim('r-e2.2.2','info',evidenceNote='Source soak test stores up to eight zones for a conditional 14-day period. Long-running alarm-response behavior is not simulated.')

# Outputs: documented trigger choices are searchable, but the subsequent pattern,
# source allocation and ALL/ANY wizard are not collapsed into a false single edit.
output_sys=['Bell Follow','No Telephone Line','Communication Failure','Trouble Follow','Main Low Battery Follow','AC Loss Follow','Sensors Test','Battery Test','Bell Burglary','Scheduler','Switched Aux','GSM Error','Bell Test','Installation','Walk Test','Burglary','Panic','Fire','Special','24 Hour']
output_par=['Ready Follow','Alarm Follow','Arm Follow','Burglary Follow','Fire Follow','Panic Follow','Special Emergency Follow','Buzzer Follow','Chime Follow','Exit/Entry Follow','Fire Trouble Follow','Day (Zone) Trouble','General Trouble Follow','Stay Follow','Tamper Follow','Disarm Follow','Bell Follow','Bell Stay Off','Zone Bypass','Automatic Arm Alarm','Zone Loss Alarm','Bell Trigger','Strobe Trigger','Fail To Arm','Confirm Alarm','Duress Follow','HU Confirm Alarm','Zone Exclude']
for parent,labels,codes,pages in [('r-e3.1',output_sys,list(range(1,21)),[136]+[137]*8+[138]*6+[139]*5),('r-e3.2',output_par,list(range(1,28))+[32],[140]*8+[141]*9+[142]*5+[143]*4+[144]*2),('r-e3.3',['Zone Follow','Alarm Follow','Arm Follow','Disarm Follow'],[1,2,3,4],[144]*4)]:
 for label,c,p in zip(labels,codes,pages):add(parent+'-v'+str(c),parent,label,p,str(c).zfill(2) if parent!='r-e3.3' else str(c),'selection')
for i in range(5):sim('r-e3.'+str(i),'info',evidenceNote='Trigger branch is documented. Output programming continues through source allocation and pattern/logic/label steps; that hardware-dependent wizard is reference-only.')
for i,label in enumerate(['Pulse N/C','Latch N/C','Pulse N/O','Latch N/O']):
 add('r-output-pattern-'+str(i+1),'r-e3',label,146 if i<3 else 147,str(i+1),'reference',summary='Conditional pattern-of-operation value after the trigger is selected; not a root Outputs shortcut.')
for label,p in [('Pulse duration: 01–90 seconds',146),('Activation: ALL / ANY',147),('Deactivation: ALL / ANY — latch only',147),('Output label: 10 characters',147)]:add('r-output-field-'+str(len(nodes)),'r-e3',label,p,None,'reference')

sim('r-e4.1','menu',selector='user',scope='user')
sim('r-e4.1.1','flags',scope='user',choices=[{'id':str(i),'label':'Partition '+str(i),'code':str(i),'value':str(i)} for i in range(1,5)],defaultValue={'1':True})
choices('r-e4.1.2',['Master','User','Arm Only','Cleaner','User Unbypass','Guard','Duress','UO Control'],149,None,scope='user')
for path,p in [('4.2',150),('4.3',151),('4.4',151)]:textfield('r-e'+path,p,4,'',textMode='digits',minLength=4)
choices('r-e4.5',['4 Digits','6 Digits'],151,['1','2'])
sim('r-e4.5','info',evidenceNote='Changing source code length erases/reinitializes codes. This consequential multi-record procedure is reference-only; no factory codes are supplied.')

# Explicit communication booleans and enumerations are safe local settings.
for path in ['5.1.1.2.1','5.1.1.2.2','5.1.2.4.1','5.1.2.4.2','5.1.3.5.1','5.1.4.5.1','5.2.4.1','5.2.4.2','5.2.4.3','5.2.4.4','5.2.4.5','5.2.4.6','5.2.4.7','5.3.3.1','5.3.3.2','5.4.1.5.1','5.4.1.5.2','5.4.2.1','5.4.2.2']:
 boolean('r-e'+path,by['r-e'+path]['sourceRefs'][0]['pdfPage'])
choices('r-e5.1.1.3.1',['DTMF','PULSE, 20BPS','PULSE, 10BPS'],153,['1','2','3'])
choices('r-e5.1.3.1.1',['Dynamic IP','Static IP'],160,['1','2'])
choices('r-e5.2.3',['Contact ID','SIA'],169,['1','2'])
choices('r-e5.2.5.2',['On Bell Timeout','Follow Zone','At Disarm'],171,['1','2','3'])
for parent,labels,p in [('5.1.2.1.4',['Primary','Secondary','Backup'],155),('5.1.3.4',['Primary','Secondary','Backup'],162),('5.2.5.3',['Encryption Key','Receiver Number','Line Number'],172),('5.2.8',['Edit Codes','Delete All'],259),('5.3.4',['IP Address','IP Port'],179)]:
 for i,label in enumerate(labels):eng(parent+'.'+str(i+1),label,p)
for path in ['5.2.1.1','5.2.1.2','5.2.1.5']:
 labels=['PSTN/GSM','GSM/PSTN','PSTN Only','GSM Only'] if path.endswith('.1') else ['IP/GPRS','GPRS/IP','IP Only','GPRS Only']
 page=167 if path.endswith('.1') else 168 if path.endswith('.2') else 169
 for i,label in enumerate(labels):add('r-e'+path+'-v'+str(i+1),'r-e'+path,label,page,str(i+1),'selection')
sim('r-e5.4.1','menu',selector='followMe',scope='followMe',evidenceNote='Choose one of four fictional Follow Me records. The source supports up to sixteen; no report is transmitted.')
for path,labels,p in [('5.4.1.1.1',['PSTN/GSM','GSM/PSTN','PSTN Only','GSM Only'],180),('5.4.1.1.2',['IP/GPRS','GPRS/IP','IP Only','GPRS Only'],181),('5.5.4',['IP/GPRS','GPRS/IP','IP Only','GPRS Only'],186)]:
 for i,label in enumerate(labels):add('r-e'+path+'-v'+str(i+1),'r-e'+path,label,p,str(i+1),'selection')
fm_event_groups=[
 ('5.4.1.3.1','Alarms',181,[('Intruder',181),('Fire',181),('Emergency',181),('Panic (S.O.S)',181),('Tamper',182),('Duress Alarm',182),('Confirmed alarm',182)],1),
 ('5.4.1.3.2','Arm/Disarm',182,[('Arm',182),('Disarm',182)],1),
 ('5.4.1.3.3','Troubles',182,[(x,182) for x in ['False Code','Main Low Battery','Wireless Low Battery','WL Jamming','WL Lost','AC Off','Bell Trouble','Bus Trouble','Siren low Battery','PSTN Trouble','IP Network']],2),
 ('5.4.1.3.4','GSM',182,[('GSM Trouble',182),('SIM Trouble',183),('SIM Expire',183),('SIM Credit',183)],1),
 ('5.4.1.3.5','Environmental',183,[(x,183) for x in ['Gas Alert','Flood Alert','CO Alert','High Temperature','Low Temperature','Technical']],1),
 ('5.4.1.3.6','Miscellaneous',183,[(x,183) for x in ['Zone Bypass','Periodic test','Remote programming']],1),
 ('5.4.1.4.1','Alarms',184,[(x,184) for x in ['Intruder Alarm','Tamper']],2),
 ('5.4.1.4.2','Troubles',184,[(x,184) for x in ['Main Low Battery','WL Low Battery','Jamming','WL Lost','AC Off','Bell Trouble','Bus trouble','Siren low Battery trouble','PSTN Trouble','IP Network']],2),
 ('5.4.1.4.3','GSM',184,[('GSM Trouble',184)],1),
 ('5.4.1.4.4','Environmental',184,[(x,184) for x in ['Gas Alert','Flood Alert','CO Alert','High Temperature','Low Temperature','Technical']],1)
]
for path,label,p,fields,width in fm_event_groups:
 eng(path,label,p,'setting');vals=[]
 for i,(field,page) in enumerate(fields,1):
  id='r-e'+path+'-v'+str(i);code=str(i).zfill(width);add(id,'r-e'+path,field,page,code,'selection');vals.append({'id':id,'label':field,'code':code,'value':id})
 sim('r-e'+path,'flags',scope='followMe',choices=vals,defaultValue={},digitSelectOnly=True,evidenceNote='Per-destination fictional reporting flags. Arrows choose a flag; Full/Part changes it; OK stores. No communication occurs.')
for label in ['MS Call All','FM Call All']:add('r-cloud-control-'+str(len(nodes)),'r-e5.5.5',label,187,None,'reference',summary='Unnumbered cloud-reporting control described as Yes/No; exact screen sequence remains reference-only.')
audio_fields=['Intruder alarm','Fire alarm','Emergency','Panic alarm','Tamper alarm','Environmental alert','Away arm','Stay arm','Disarm','Audible Status','Entry / Exit','Auto arm','Output On/Off','Walk test']
vals=[]
for i,label in enumerate(audio_fields,1):
 id='r-audio-local-'+str(i);add(id,'r-e6.2',label,189 if i<=3 else 190,str(i).zfill(2),'selection');vals.append({'id':id,'label':label,'code':str(i).zfill(2),'value':id})
by['r-e6.2']['kind']='setting';sim('r-e6.2','flags',choices=vals,defaultValue={},digitSelectOnly=True,evidenceNote='Fictional announcement-enable flags for an assigned voice module. Recorded speech and hardware audio are not reproduced.')
by['r-e6']['conditions']=['The real menu appears only when a voice module is assigned. FINDR exposes the documented branch with fictional data.']
for i in range(1,7):add('r-audio-play-'+str(i),'r-e6.1.'+str(i),'Play',188,'1','reference',summary='Play is a documented option within this message category; recording and playback require the physical voice module.')

# Conditional peripheral fields remain factual reference children, rather than
# invented extra selectable models or successful enrolment results.
conditional = [
 ('r-e2.1.2.7.4','WatchOUT PIR',118,['LEDS','PIR Sensitivity','Lens Type','Auxiliary Relay Mode','Auxiliary Relay Time']),
 ('r-e2.1.2.7.4','iWISE DT',119,['LEDS','MW (Microwave) Range','ACT','Automatic Microwave Bypass','Green Line','Self Test']),
 ('r-e2.1.2.7.4','(Industrial) Lunar / BWare / iWISE DT Grade 3',120,['LEDS','MW (Microwave) Range','ACT','Automatic Microwave Bypass','Green Line','Anti-Mask',('Arm/Disarm',121),('Self Test',121)]),
 ('r-e2.1.2.7.4','iWISE QUAD Grade 2',121,['LEDS','PIR Sensitivity','Self Test']),
 ('r-e2.1.2.7.4','iWISE / BWare QUAD Grade 3',122,['LEDS','PIR Sensitivity','Anti-Mask','Arm/Disarm','Self Test']),
 ('r-e2.1.2.7.4','WatchOUT DT',123,['LEDS','PIR Sensitivity','MW (Microwave) Range','Anti Mask Sensitivity','Lens Type','Anti-Mask','Arm/Disarm','Prox Anti-mask']),
 ('r-e2.1.2.7.4','WatchIN DT Grade 3',124,['LEDS','Detection Sensitivity','MW (Microwave) Range','Alarm Logic','Lens Type','Anti-Mask','Arm/Disarm',('Green Line',125),('Sway',125)]),
 ('r-e2.1.2.7.4','Seismic',125,['LEDs','Seismic Sensitivity','Interference Time','Explosion Sensitivity','Temperature Sensitivity',('Low-Temp Alarm',126),('High-Temp Alarm',126),('Arm/Disarm — not used',126),('Self Test — not used',126)]),
 ('r-e2.1.2.7.5','One-way detectors / two-way smoke',126,['Serial No.','Control: Supervision',('Control: LED Enable',127),('Operation Mode — two-way smoke only',127)]),
 ('r-e2.1.2.7.5','Two-way PIR / Shock / Flood / Piccolo / Beyond / Curtain / High Temperature / Zone Button / WatchOUT',127,['Serial No.','Control: Supervision','Control: LED Enable','Control: Anti Mask — Beyond and WatchOUT','Detection Mode',('Sensitivity',128),('MW Sensitivity',128),('Disposition Sensor — Beyond only',128)]),
 ('r-e2.1.2.7.5','Two-way Magnet (X73)',129,['Serial No.','Control: Supervision','Control: LED Enable','Magnet Enable — M&F Univ only','Alarm Hold On','Input Termination',('Input Response Time',130),('Anti-Sabotage — F Univ only',130),('Shutter Pulse — F SP only',130)]),
]
for parent,label,p,fields in conditional:
 id=parent+'-variant-'+str(len(nodes));add(id,parent,label,p,None,'reference',summary='Conditional installed-detector context, not an extra keypad menu.',conditions=['Only the matching recognised detector exposes these parameters.'])
 for field in fields:
  label,page=field if isinstance(field,tuple) else (field,p)
  add(id+'-'+str(len(nodes)),id,label,page,None,'reference')
for parent,labels,p in [('r-e7.2.2.1',['Zone','Keyfob','Keypad'],207),('r-e7.2.2.2',['Zone','Keyfob','Keypad'],208)]:
 for i,label in enumerate(labels):add(parent+'-v'+str(i+1),parent,label,p,str(i+1),'reference',summary='Device class selected during hardware allocation; no radio enrolment is simulated.')
for parent,group,p,fields in [
 ('r-e8.1','Parameters',208,[('Label',208,'1'),('Partition',208,'2'),('Masking',208,'3'),('Controls: Emergency',209,'4.1'),('Controls: Multi view',209,'4.2'),('Controls: Exit beeps',209,'4.3'),('Serial Number',209,'5'),('Function Key — two-way',209,'6'),('UO Control 1',209,'7'),('UO Control 2',209,'8'),('UO Control 3',209,'9')]),
 ('r-e8.2','One-way Keyfob',210,['None','Arm','Disarm','Stay','Group','UO','Panic']),
 ('r-e8.2','Two-way Keyfob',211,[('Label',260,'1'),('Serial No.',211,'5'),('Masking',211,'6'),('Controls: Panic',211,'7.1'),('PIN Code',211,'8'),('UO Key 1',211,'9'),('UO Key 2',211,'10'),('UO Key 3',260,'11')]),
 ('r-e8.3.1','Wired BUS sounder',211,[('Label',211,'01'),('Strobe: Control',212,'02.1'),('Strobe: Blink',212,'02.2'),('Strobe: Arm Squawk',212,'02.3'),('Siren LED',213,'03'),('Battery Load Test',213,'04'),('Proximity Level Response',213,'05'),('Volume',213,'06'),('Lamp: Type',214,'07.1'),('Lamp: Brightness — conflicting source code',214,None),('Power Source',214,'08'),('Siren Current',214,'09'),('Alarm Sound',214,'10')]),
 ('r-e8.3.1','Two-way wireless sounder',215,[('Label',215,'01'),('Strobe: Control',215,'02.1'),('Strobe: Blink',215,'02.2'),('Strobe: Arm Squawk',215,'02.3'),('Volume: Alarm',216,'03.1'),('Volume: Squawk',216,'03.2'),('Volume: Exit Entry',216,'03.3'),('Serial No.',216,'04'),('Supervision',216,'05')]),
 ('r-e8.3.2','Lamp times',216,['Lamp Start','Lamp Stop']),
 ('r-e8.4','Proximity reader',217,[('Masking',217,'1'),('Control: INSTANT ARM?',217,'2.1'),('Control: SHOW READY?',217,'2.2'),('Control: SHOW ARM?',217,'2.3'),('Control: SHOW STAY?',217,'2.4'),('Control: SHOW BYPASS?',217,'2.5')]),('r-e8.5','Power supply',218,[('Masking',218,'1'),('Control: BELL/L.SPEAK',218,'2.1')])]:
 id=parent+'-variant-'+str(len(nodes));add(id,parent,group,p,None,'reference',summary='Conditional installed peripheral context; not an extra numbered menu.')
 for field in fields:
  label,page,code=field if isinstance(field,tuple) else (field,p,None)
  add(id+'-'+str(len(nodes)),id,label,page,code,'reference')

# Separate UK authorised user context. No numeric shortcuts are invented for a
# table that provides menu order but not local quick-key numbers.
add('r-user',None,'UK User Functions',46,source='user-uk-e',summary='Already-authorised Grand Master practice context, pinned to the separate 2021 UK user manual.')
def user(id,parent,label,p,kind='menu',**kw):return add(id,parent,label,p,None,kind,'user-uk-e',**kw)
user_tree=[
 ('r-u-activities','r-user','Activities',46),('r-u-omit','r-u-activities','Omit',46),('r-u-omit-zones','r-u-omit','Zones',40),
 ('r-u-omit-once','r-u-omit-zones','One Time Only',40),('r-u-omit-reset','r-u-omit-zones','Omit Reset',46),('r-u-omit-recall','r-u-omit-zones','Omit Recall',46),('r-u-omit-permanent','r-u-omit-zones','Permanent Omit',40),('r-u-omit-tamper','r-u-omit','Tamper omit',46),
 ('r-u-outputs','r-u-activities','Outputs',46),('r-u-sound','r-u-activities','Keypad Sound',47),('r-u-chime','r-u-sound','Chime',47),('r-u-keypad-chime','r-u-chime','Keypad Chime',47),('r-u-partition-chime','r-u-chime','Partition Chime',47),('r-u-buzzer','r-u-sound','Buzzer On/Off',47),
 ('r-u-anti','r-u-activities','Anti Code',47),('r-u-cs','r-u-activities','Configure SW',47),('r-u-cs-enable','r-u-cs','Enable CS',47),('r-u-cs-call','r-u-cs','CS connect (Initiate Call)',47),('r-u-sim','r-u-activities','Prepaid SIM',47),('r-u-sim-credit','r-u-sim','Check Credit',47),('r-u-sim-reset','r-u-sim','Reset SIM',47),('r-u-sim-call','r-u-sim','User call',48),
 ('r-u-advanced','r-u-activities','Advanced',48),('r-u-aux','r-u-advanced','Switch AUX',48),('r-u-void','r-u-advanced','Void Report Programming',48),('r-u-service','r-u-advanced','Service Mode',48),('r-u-overload','r-u-advanced','Overload restore',48),
 ('r-u-fm','r-user','Follow Me',48),('r-u-fm-define','r-u-fm','Define',48),('r-u-fm-destination','r-u-fm-define','Destination',48),('r-u-fm-label','r-u-fm-define','Label',49),('r-u-fm-terminate','r-u-fm','Terminate Follow Me',49),('r-u-fm-test','r-u-fm','Test Follow Me',49),
 ('r-u-view','r-user','View',49),('r-u-fault','r-u-view','Fault',49),('r-u-alarm-memory','r-u-view','Alarm Memory',49),('r-u-partition-status','r-u-view','Partition Status',49),('r-u-zone-status','r-u-view','Zone Status',49),('r-u-info','r-u-view','Service Info',49),('r-u-level','r-u-info','System Entry Level',49),('r-u-version','r-u-info','System Version',49),('r-u-serial','r-u-info','Serial Number',49),('r-u-panel-id','r-u-info','Panel ID',50),('r-u-ip','r-u-view','IP Address',50),
 ('r-u-codes','r-user','Codes/Tags',50),('r-u-codes-define','r-u-codes','Define',50),('r-u-codes-code','r-u-codes-define','Codes',50),('r-u-codes-edit','r-u-codes-code','Edit Code',50),('r-u-codes-erase','r-u-codes-code','Erase Code',50),('r-u-tag','r-u-codes-define','Proximity Tag',50),('r-u-tag-write','r-u-tag','(Re)write Tag',50),('r-u-tag-delete','r-u-tag','Delete Tag',50),('r-u-user-label','r-u-codes-define','Edit Label',50),('r-u-delete-by-tag','r-u-codes','Delete By Tag',50),
 ('r-u-clock','r-user','Clock',50),('r-u-time','r-u-clock','Time & Date',50),('r-u-scheduler','r-u-clock','Scheduler',50),('r-u-weekly','r-u-scheduler','Weekly',50),('r-u-onetime','r-u-scheduler','One Time',50),('r-u-schedule-enable','r-u-scheduler','Schedule Enable',50),('r-u-vacation','r-u-clock','Vacation',51),
 ('r-u-log','r-user','Event Log',51),('r-u-maintenance','r-user','Maintenance',51),('r-u-walk','r-u-maintenance','Walk test',51),('r-u-walk-full','r-u-walk','Full walk test',51),('r-u-walk-quick','r-u-walk','Quick walk test',51),('r-u-keypad-test','r-u-maintenance','Keypad test',51),('r-u-sounder-test','r-u-maintenance','Sounder test',51),('r-u-strobe-test','r-u-maintenance','Strobe test',51),('r-u-macro','r-user','Macro',51),('r-u-keyfobs','r-user','Stand Alone Keyfobs',51)
]
for id,parent,label,p in user_tree:user(id,parent,label,p)
for id,label,p in [('r-u-keyfobs-new','New Keyfob',44),('r-u-keyfobs-delete','Delete Keyfob',45),('r-u-keyfobs-deleteall','Delete All Keyfobs',45),('r-u-keyfobs-po','PO Buttons',45)]:user(id,'r-u-keyfobs',label,p)
for id in ['r-u-omit-once','r-u-omit-permanent']:
 by[id]['kind']='command';by[id]['aliases']=['disable device','bypass zone','isolate detector','restore device','reinstate zone']
 sim(id,'omit',eligibleOnly=True,eligibleZoneTypes=zone_types[1:13]+['Day','Final Exit','Entry Follower + Stay'],toggleKeys=['part-set'],commitKey='enter',finishKey='back',numericSelection=False,evidenceNote='Select intrusion zones with the arrows and Part Set key; OK confirms. A permanent omission is stored separately from One Time Only. The fixture does not permit Fire, Panic, Tamper, unused or conditional 24-hour circuits in this list.')
for id in ['r-u-keypad-chime','r-u-partition-chime','r-u-buzzer']:
 choices(id,['Off','On'],47,None,values=[False,True],source='user-uk-e')
sim('r-u-fm-define','menu',selector='followMe',scope='followMe')
for id,length,value in [('r-u-fm-destination',32,'demo@example.invalid'),('r-u-fm-label',16,'Demo follow me'),('r-u-user-label',16,'Demo user')]:
 sim(id,'text',maxLength=length,defaultValue=value,evidenceNote='Fictional local text helper; nothing is transmitted.');by[id]['kind']='setting'
sim('r-u-codes-define','menu',selector='user',scope='user')
sim('r-u-codes-edit','text',minLength=4,maxLength=4,textMode='digits',defaultValue='',evidenceNote='The fictional site uses four-digit codes. No authentication or factory credential is provided.')
sim('r-u-time','text',maxLength=17,defaultValue='14:30 29/10/26',evidenceNote='Source format is HH:MM and DD/MM/YY; FINDR uses a combined helper and does not advance the simulated calendar.')
sim('r-u-schedule-enable','choice',selector='schedule',scope='schedule',numericSelection=False,choices=[{'id':'off','label':'Off','value':False},{'id':'on','label':'On','value':True}],defaultValue=False)

# Installer non-programming operations are a third, already-authorised context.
# The map only prints 1 Programming and 2 Activities; other shortcut numbers are
# not asserted. No user omission is exposed as an installer privilege.
add('r-service',None,'Installer Non-Programming Menus',219,summary='Already-authorised installer operations; kept separate from programming and UK user access.')
service_tree=[('r-s-activities','r-service','Activities',219),('r-s-keypad-sound','r-s-activities','Keypad Sound',219),('r-s-chime','r-s-keypad-sound','Chime',219),('r-s-buzzer','r-s-keypad-sound','Buzzer On/Off',219),('r-s-fm','r-service','Follow Me',219),('r-s-fm-define','r-s-fm','Define',219),('r-s-fm-destination','r-s-fm-define','Destination',219),('r-s-fm-label','r-s-fm-define','Label',219),('r-s-fm-terminate','r-s-fm','Terminate Follow Me',219),('r-s-fm-test','r-s-fm','Test Follow Me',219),('r-s-view','r-service','View',220),('r-s-trouble','r-s-view','Trouble',220),('r-s-alarm','r-s-view','Alarm Memory',220),('r-s-partition-status','r-s-view','Partition Status',220),('r-s-zone-status','r-s-view','Zone Status',220),('r-s-info','r-s-view','Service Information',220),('r-s-installer-info','r-s-info','Installer',220),('r-s-version','r-s-info','System Version',220),('r-s-ip','r-s-view','IP Address',220),('r-s-advanced','r-s-view','Advanced',220),('r-s-ms-test','r-s-advanced','MS Test',220),('r-s-clock','r-service','Clock',221),('r-s-time','r-s-clock','Time & Date',221),('r-s-scheduler','r-s-clock','Scheduler',221),('r-s-weekly','r-s-scheduler','Weekly',221),('r-s-onetime','r-s-scheduler','One Time',221),('r-s-vacation','r-s-clock','Vacation',221),('r-s-log','r-service','Event Log',221),('r-s-maintenance','r-service','Maintenance',221),('r-s-walk','r-s-maintenance','Walk Test',221),('r-s-walk-full','r-s-walk','Full walk test',221),('r-s-walk-quick','r-s-walk','Quick walk test',221),('r-s-siren','r-s-maintenance','Siren Test',222),('r-s-strobe','r-s-maintenance','Strobe Test',222),('r-s-resistance','r-s-maintenance','Zone Resistance',222),('r-s-diagnostics','r-s-maintenance','Diagnostics',222),('r-s-macro','r-service','Macro',223),('r-s-keyfobs','r-service','Stand Alone Keyfobs',223)]
for id,parent,label,p in service_tree:add(id,parent,label,p)
for id,label,p in [('main','Main Unit',222),('bus','Bus Zones',222),('expander','Zone Expander',222),('psu','Power supply',222),('siren','Siren',222),('gsm','GSM',222),('ip','IP',222),('wireless','Wireless',223),('keypad','Keypads',223),('voice','Voice',223),('lrt','LRT',223)]:add('r-s-diag-'+id,'r-s-diagnostics',label,p)
for id,fields,p in [('gsm',['Signal (RSSI)','Version','IMEI'],222),('ip',['IP Address','Version','MAC Address'],222),('wireless',['Communication Test','Battery Test'],223),('main',['Standby battery level','System version'],222)]:
 for label in fields:add('r-s-diag-'+id+'-'+str(len(nodes)),'r-s-diag-'+id,label,p,None,'reference')

for id in ['r-u-zone-status','r-s-zone-status','r-s-resistance']:
 sim(id,'zones',showResistance=id=='r-s-resistance',detailsKey='enter' if id=='r-s-resistance' else 'none',numericSelection=False,evidenceNote='All zone states, voltages and resistance values are fictional practice readings.');by[id]['kind']='status'
for id in ['r-u-log','r-s-log','r-u-alarm-memory','r-s-alarm']:
 sim(id,'log',toggleKeys=[],logFilter='alarm' if 'alarm' in id else None,evidenceNote='Fictional events. The source log cannot be erased; Full Set / Part Set jump through the local fixture log.');by[id]['kind']='status'
for id in ['r-u-walk-full','r-u-walk-quick','r-s-walk-full','r-s-walk-quick']:
 sim(id,'walk',selectedOnly=False,finishKey='back',evidenceNote='Fictional detector actions. Full test lists detected zones; Quick test lists untested zones. The source has a 60-minute maximum; FINDR does not run a real one-hour timer.');by[id]['kind']='command'
for id in ['r-u-outputs','r-u-sounder-test','r-u-strobe-test','r-s-siren','r-s-strobe']:
 sim(id,'outputs',outputs=['Demo output'] if id=='r-u-outputs' else ['Strobe'] if 'strobe' in id else ['Sounder'],toggleKeys=['enter'],numericSelection=False,outputsOnEnter=id!='r-u-outputs',evidenceNote='Local simulated output only. Selecting a sounder/strobe test starts it; leaving the screen always stops it. No sounder, strobe, relay or communicator is connected.');by[id]['kind']='command'
for id in ['r-u-fault','r-s-trouble','r-u-partition-status','r-s-partition-status','r-u-version','r-s-version','r-u-level','r-u-serial','r-u-panel-id','r-u-ip','r-s-ip','r-s-installer-info']:
 sim(id,'status',statusKind='risco',evidenceNote='FINDR fixture status; identifiers and version are illustrative, not a claim about installed firmware.');by[id]['kind']='status'
for id in ['r-u-omit-reset','r-u-omit-recall']:
 sim(id,'action',action='risco-omit-reset' if id.endswith('reset') else 'risco-omit-recall',requiresConfirm=True);by[id]['kind']='command'
sim('r-e0','action',action='logout',requiresConfirm=True)
by['r-e0']['kind']='command'

# Honest defaults: confirmed menus are navigable; unsupported leaf behavior is
# explicitly reference-only. Conditional reference branches remain searchable.
for n in nodes:
 if n['kind'] in ['reference','selection']:continue
 kids=[x for x in nodes if x['parentId']==n['id'] and x['kind'] not in ['reference','selection']]
 if 'simulation' not in n:
  if kids:n['simulation']={'mode':'menu'}
  else:
   n['kind']='setting' if n['id'].startswith('r-e') else 'command'
   n['simulation']={'mode':'info','evidenceNote':'Documented location and label. Its conditional wizard or hardware response is reference-only; FINDR does not invent a successful result.'}
 if n['id'].startswith(('r-u','r-s')):
  n['simulation']['directNumericMenus']=False;n['simulation']['numericSelection']=False
 if n['simulation']['mode'] in ['choice','flags']:
  n['simulation']['choiceToggleKeys']=['arm','part-set'];n['simulation']['flagToggleKeys']=['arm','part-set']

gaps=[
 {'id':'separate-editions','reason':'Installer G (2020) and UK user E (2021) are distinct documented baselines. UK Set/Omit/Fault terminology is not silently substituted for installer Arm/Bypass/Trouble.','affectedNodeIds':['r-installer','r-user']},
 {'id':'source-map-errors','reason':'Appendix p255 repeats Abort Alarm and its old type summary on p104 conflicts with the complete pp107–114 type table. p257 repeats PSTN Parameters as 2; detailed p153 verifies 3. Detailed pages take precedence.','affectedNodeIds':['r-e2.1.2.3','r-e2.1.2.7.3','r-e5.1.1.3']},
 {'id':'conditional-hardware','reason':'Installed BUS/wireless detector and peripheral variants alter available fields. Reference branches expose the documented names without inventing extra model-selection menus or device responses.','affectedNodeIds':['r-e2.1.2.7.4','r-e2.1.2.7.5','r-e7','r-e8']},
 {'id':'one-by-one-atomic','reason':'Source p102 requires completing the entire One By One wizard to save. That wizard remains reference-only; confirmed By Category edits are functional.','affectedNodeIds':['r-e2.1.1']},
 {'id':'zone-label-limit','reason':'Source p102 says 15 characters for One By One, while p103 gives 16 for By Category. The functional By Category editor uses its own 16-character limit.','affectedNodeIds':['r-e2.1.1','r-e2.1.2.1']},
 {'id':'output-wizard','reason':'Trigger selection is followed by conditional source, pattern, duration, logic and label steps. This programming wizard remains reference-only rather than pretending a single field completes it; separate operational output tests work.','affectedNodeIds':['r-e3']},
 {'id':'user-order-no-numbers','reason':'The complete UK user function table gives order but no numerical quick-key addresses. User and service sessions use scrolling; no shortcut numbers are guessed.','affectedNodeIds':['r-user','r-service']},
 {'id':'no-live-transport','reason':'All data are fictional local state. No codes, tag enrolment, RF exchanges, remote software, cloud registration, monitoring, reset algorithm or factory authentication is supplied.','affectedNodeIds':['r-e5','r-u-anti','r-u-tag','r-u-delete-by-tag']}
]
gaps.append({'id':'lamp-brightness-number','reason':'Detailed p214 prints 07.1 for both Lamp Type and Brightness, while appendix p261 prints 07.2 for Brightness. The conflicting Brightness quick code is not exposed as an interactive shortcut.','affectedNodeIds':['r-e8.3.1']})
questions={
 'separate-editions':('Which installed LightSYS2 firmware/language should the combined experience target?','A version-screen photo and matching installer/user manual edition, with credentials redacted.'),
 'source-map-errors':('Does the real target keypad match the detailed G tables for PSTN Parameters and zone types?','Screen-by-screen capture of the affected local lists with firmware/version visible separately.'),
 'conditional-hardware':('Which BUS/wireless detector, sounder and keypad variants should gain working field wizards?','Exact device model IDs and authorised recordings of their parameter and acknowledgement screens.'),
 'one-by-one-atomic':('At which exact screen does One By One record its entire zone edit, and how does cancellation behave?','An authorised recording of a full zone wizard and a cancelled edit on the selected firmware.'),
 'zone-label-limit':('Does the target firmware accept 15 or 16 characters in each of the two zone-label methods?','A non-sensitive test label entered through both One By One and By Category.'),
 'output-wizard':('Which conditional pattern/source/ALL–ANY screens appear for each output trigger family?','An authorised recording of the complete output wizard with a safely isolated test output.'),
 'user-order-no-numbers':('What exact user/service menu order and local numbers are displayed on the UK target firmware?','Pictures or video of every top-level user/service option after authorised entry; no authentication codes.'),
 'no-live-transport':('Which disconnected service workflows are useful to model next?','Manufacturer instructions and a bench-only screen sequence, excluding credentials and live monitoring actions.'),
 'lamp-brightness-number':('Is Lamp Brightness 07.1 or 07.2 on the specified BUS sounder and panel revision?','The displayed Lamp submenu with the exact sounder model and firmware identified.')
}
for gap in gaps:gap['question'],gap['neededEvidence']=questions[gap['id']]
for id,tasks in {'r-u-omit-once':['omit-zone','restore-zone'],'r-s-resistance':['check-resistance'],'r-u-zone-status':['view-zone-status'],'r-u-log':['find-last-alarm'],'r-u-walk-full':['walk-test-pir'],'r-e0':['leave-engineering']}.items():by[id]['practiceTaskIds']=tasks
excluded=['One By One atomic zone wizard','Output programming wizard and its conditional activation logic','Physical device enrolment and RF exchanges','Firmware download, default reset and anti-code algorithms','Actual cloud, telephone and monitoring transport','Long-running timers, soak-test alarm response and panel standards validation']
atlas={'schemaVersion':1,'profileId':'risco-lightsys2','title':'RISCO LightSYS2 · RP432KP LCD','panelModels':['LightSYS2'],'keypadModels':['RP432KP','RP432KPP'],'baseline':'Installer 5IN2048 G (06/2020); separately labelled UK user 5IN2124 E (08/2021); physical keypad 5IN1425 H (01/2022). No LightSYS+ or latest-firmware equivalence.','scope':'Full published top-level programming tree, reviewed parameter tables, conditional device references, UK user functions and installer operations. Functional common settings/actions are explicitly separated from reference-only hardware-dependent wizards.','verifiedAt':'2026-10-29','sources':sources,'numbering':{'style':'Local sequential quick keys for installer programming only','explanation':'Digits traverse one local menu level at a time. Two-digit options retain their leading zero. Zone/user identifiers and choice values are not root shortcuts. UK user/service entries are scroll-only.','examples':['1 → 1 → 01 → 1: Entry Delay 1','2 → 1 → 2 → 3: Type, followed by zone selection and the type value','0 → OK: Exit and save from the installer root'],'caveats':['Device-dependent numbered menus can be non-successive.','Appendix typos are resolved using detailed parameter tables and recorded in the audit.']},'navigation':[{'keys':['0–9'],'action':'Installer quick-key navigation and numeric entry','sourceRefs':[ref(65)]},{'keys':['back'],'action':'Back / quit / discard an unconfirmed edit','sourceRefs':[ref(65),ref(4,'keypad-h')]},{'keys':['enter'],'action':'Enter / OK / save','sourceRefs':[ref(65),ref(4,'keypad-h')]},{'keys':['previous','next'],'action':'Navigate the list or move the entry cursor','sourceRefs':[ref(65),ref(4,'keypad-h')]},{'keys':['arm','part-set'],'action':'Change displayed data; toggle Yes/No during programming','sourceRefs':[ref(66),ref(4,'keypad-h')]}],'nodes':nodes,'gaps':gaps,'coverage':{'documentedEntries':len(nodes),'hardwareVerified':False,'excludedAreas':excluded,'note':'Every entry has a page citation. Reference-only hardware branches are not claimed as completed panel emulation.'}}
OUT.write_text(json.dumps(atlas,indent=2,ensure_ascii=False)+'\n')
(ROOT/'research/expansion-0.9.0/risco-audit.json').write_text(json.dumps({'profileId':atlas['profileId'],'sources':sources,'baseline':atlas['baseline'],'documentedEntries':len(nodes),'gaps':gaps,'sourceCorrections':{'PSTN Parameters':'5.1.1.3 from p153; p257 incorrectly repeats 2.','Zone types':'Full table pp107–114 supersedes inconsistent old summary p104.','Device controls':'p95–96 includes 4,6,7,8,9 omitted from appendix p254; no code 5 is invented.','Resistance':'2.1.3 p130 is configuration; diagnostic is installer Maintenance, p222.','Firmware':'No specific firmware build asserted for the G manual; modern 5IN2912/LightSYS+ excluded.'},'fixtureValues':'All stored values, records, event times, readings and device responses are fictional.','notImplementedAsHardware':['One By One zone wizard','Output programming wizard','Device allocation and RF calibration','Firmware download','Reset/anticode and factory credentials','Cloud/monitoring/telephone exchanges']},indent=2,ensure_ascii=False)+'\n')
print('Wrote',len(nodes),'documented entries')
