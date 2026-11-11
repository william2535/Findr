"""Create labelled, fictional manuals for FINDR Quick Questions browser QA.

These are test documents, not instructions for real fire/security equipment.
"""
from pathlib import Path
from textwrap import wrap
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'tests' / 'fixtures' / 'questions027'
DEST.mkdir(parents=True, exist_ok=True)


def document(filename, title, pages):
    output = DEST / filename
    pdf = canvas.Canvas(str(output), pagesize=A4, invariant=1, pageCompression=0)
    pdf.setTitle(title)
    pdf.setAuthor('FINDR synthetic QA fixture generator')
    for number, lines in enumerate(pages, 1):
        pdf.setFont('Helvetica-Bold', 13)
        pdf.drawString(42, 805, 'SYNTHETIC QA ONLY - NOT A REAL EQUIPMENT MANUAL')
        pdf.setFont('Helvetica', 11)
        y = 776
        for line in lines:
            if not line:
                y -= 12
                continue
            for part in wrap(line, 89, break_long_words=False):
                pdf.drawString(42, y, part)
                y -= 17
        pdf.setFont('Helvetica', 9)
        pdf.drawString(42, 30, f'Synthetic printed page Q-{number} / PDF page {number}')
        pdf.showPage()
    pdf.save()
    return output


cover = [
    'Manufacturer: Test Bench',
    'Model: FINDR-QA-100',
    'Equipment: Fire alarm control panel',
    'Document type: User guide',
    'Revision: QA-027',
    '',
    'This fictional fire alarm control panel exists only for browser verification. '
    'The model names, buttons and behaviour below do not describe real equipment. '
    'Confirm the equipment label before applying any actual manufacturer procedure. '
    'This fixture supports read-only questions about event history. It does not '
    'provide installer access codes, disablement procedures, electrical tests or '
    'authority to impair a fire alarm system. External equipment requires its own '
    'relevant manual. The event history records observations but does not establish '
    'whether the cause of a fault has been repaired or the system has been restored.'
]
paths = [document('synthetic-quick-panel.pdf', 'SYNTHETIC FINDR-QA-100 User guide QA-027', [cover, [
    'Manufacturer: Test Bench. Model: FINDR-QA-100. Revision: QA-027.',
    'Section 2 - Viewing event history',
    'For this fictional panel, the read-only event history is available from the front controls.',
    '1. Press VIEW on the panel front.',
    '2. Select EVENT HISTORY from the displayed menu.',
    '3. Use the UP and DOWN buttons to browse the stored events.',
    '4. Press BACK to leave event history.',
    'The EVENT HISTORY menu is inside VIEW. Step two selects EVENT HISTORY after VIEW '
    'has already been opened. Viewing the log does not clear its entries or reset a fault. '
    'This synthetic panel retains 120 event entries. Record the exact event wording and '
    'time shown when investigating a fault. A cleared indication does not confirm its cause.',
    'Section 3 - Limits of this guide',
    'Walk test is not described in this user guide. Obtain the applicable installer manual '
    'and the installed configuration before answering how walk test is performed. '
    'The external power supply is a separate component. This panel guide does not '
    'establish the PSU terminal assignments, current rating or operating voltage.'
]])]
paths.append(document('synthetic-quick-psu.pdf', 'SYNTHETIC QA-PSU-24 Datasheet QA-027', [[
    'Manufacturer: Test Bench', 'Model: QA-PSU-24', 'Equipment: External power supply PSU',
    'Document type: Datasheet', 'Revision: QA-027', '', 'Section 1 - Fictional output specification',
    'This test-only external power supply provides a nominal 24 V DC output. The fictional '
    'output labels are V+ and V-. The stated continuous current rating is 1 A. These '
    'values are synthetic retrieval targets, not specifications for an installed product. '
    'No wiring procedure, live measurement instruction, isolation sequence or acceptable '
    'fault-test threshold is established by this fixture. A single measured voltage '
    'does not prove that an installation is healthy. This document applies only to '
    'QA-PSU-24, not to other external supplies. The panel user guide and PSU datasheet '
    'must remain associated with their separate pieces of equipment. Relevant operating '
    'conditions and the exact manufacturer procedure must be established for real tests.'
]]))
paths.append(document('synthetic-quick-camera.pdf', 'SYNTHETIC QA-CAM-200 Datasheet QA-027', [[
    'Manufacturer: Test Bench', 'Model: QA-CAM-200', 'Equipment: CCTV network camera',
    'Document type: Datasheet', 'Revision: QA-027', '', 'Section 1 - Fictional video interface',
    'This synthetic camera lists H.264 video and ONVIF Profile S. It does not claim '
    'that every recorder implementing those labels will support every function. '
    'This document contains no verified pairing with QA-NVR-300. Obtain the recorder '
    'manual, installed firmware and a current interoperability statement before '
    'claiming a verified compatible pairing. Record whether the proposed use requires '
    'live video, recording, audio, events, analytics or PTZ. A common codec and protocol '
    'are supporting interface evidence only. This test fixture does not describe a '
    'real camera or establish power, cabling, electrical safety or environmental ratings.'
]]))
paths.append(document('synthetic-quick-recorder.pdf', 'SYNTHETIC QA-NVR-300 User guide QA-027', [[
    'Manufacturer: Test Bench', 'Model: QA-NVR-300', 'Equipment: CCTV network video recorder',
    'Document type: User guide', 'Revision: QA-027', '', 'Section 1 - Fictional camera interface',
    'This synthetic recorder lists H.264 video input and ONVIF Profile S. This manual '
    'does not name QA-CAM-200 as an approved pairing. Common interface labels alone '
    'do not establish verified interoperability, analytics, audio or event support. '
    'The installed firmware and relevant compatibility list remain required evidence. '
    'Record the functions required and compare the camera manual separately. This '
    'fixture does not establish PoE power class, storage capacity, recording retention '
    'or cable suitability. Live view alone does not demonstrate working playback, '
    'correct schedules or an intact recording history. All names and procedures in '
    'this PDF are fictional material for browser verification only.'
]]))
for output in paths:
    print(output.relative_to(ROOT))
