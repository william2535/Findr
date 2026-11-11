// Offline, inspectable route cards adapted from the engineer-supplied FINDR brief.
// References support named equipment principles. Generic questions are not
// manufacturer authorisation, numerical pass limits or live-control commands.
export const ROUTE_VERSION = '2026-11-02.1';
export const FIELD_SOURCES = [
  {
    "id": "S01",
    "title": "UK legislation",
    "description": "UK legislation | Electricity at Work Regulations 1989, regs. 12–14 and 16. Isolation, precautions on dead equipment, live-work conditions and competence. GB legal context. Select jurisdiction on site.",
    "locator": "Electricity at Work Regulations 1989, regs. 12–14 and 16. Isolation, precautions on dead equipment, live-work conditions and competence. GB legal context. Select jurisdiction on site.",
    "url": "https://www.legislation.gov.uk/uksi/1989/635/pdfs/uksi_19890635_en.pdf",
    "provenance": "User-supplied research register, FINDR brief v1.0, 2 November 2026",
    "verificationStatus": "reference-supplied",
    "numericComparatorEnabled": false
  },
  {
    "id": "S02",
    "title": "HSE",
    "description": "HSE | HSG85, Electricity at work: Safe working practices. Live-work decision and paras. 53–55 on proving dead and proving the indicator.",
    "locator": "HSG85, Electricity at work: Safe working practices. Live-work decision and paras. 53–55 on proving dead and proving the indicator.",
    "url": "https://www.hse.gov.uk/pubns/priced/hsg85.pdf",
    "provenance": "User-supplied research register, FINDR brief v1.0, 2 November 2026",
    "verificationStatus": "reference-supplied",
    "numericComparatorEnabled": false
  },
  {
    "id": "S03",
    "title": "HSE",
    "description": "HSE | GS38, Electrical test equipment for use on low voltage electrical systems, 4th edition. Test equipment and preference for dead testing.",
    "locator": "GS38, Electrical test equipment for use on low voltage electrical systems, 4th edition. Test equipment and preference for dead testing.",
    "url": "https://www.hse.gov.uk/pubns/books/gs38.htm",
    "provenance": "User-supplied research register, FINDR brief v1.0, 2 November 2026",
    "verificationStatus": "reference-supplied",
    "numericComparatorEnabled": false
  },
  {
    "id": "S04",
    "title": "UK Government",
    "description": "UK Government | Fire safety risk assessment: small and medium places of assembly. See escape routes/doors and electronic locks. Premises-specific English guidance.",
    "locator": "Fire safety risk assessment: small and medium places of assembly. See escape routes/doors and electronic locks. Premises-specific English guidance.",
    "url": "https://www.gov.uk/government/publications/fire-safety-risk-assessment-small-and-medium-places-of-assembly/fire-safety-risk-assessment-small-and-medium-places-of-assembly-accessible",
    "provenance": "User-supplied research register, FINDR brief v1.0, 2 November 2026",
    "verificationStatus": "reference-supplied",
    "numericComparatorEnabled": false
  },
  {
    "id": "S05",
    "title": "NSI",
    "description": "NSI | Publication of BS 5839-1:2025, non-domestic fire detection and alarm systems. Scope/news summary. Use the applicable licensed standard and building records when decisions depend on a clause.",
    "locator": "Publication of BS 5839-1:2025, non-domestic fire detection and alarm systems. Scope/news summary. Use the applicable licensed standard and building records when decisions depend on a clause.",
    "url": "https://www.nsi.org.uk/publication-of-bs-5839-12025-issued-for-fire-alarm-systems-in-non-domestic-premises/",
    "provenance": "User-supplied research register, FINDR brief v1.0, 2 November 2026",
    "verificationStatus": "reference-supplied",
    "numericComparatorEnabled": false
  },
  {
    "id": "S06",
    "title": "Fire Industry Association",
    "description": "Fire Industry Association | Guidance update on BS 7273-4:2015+A2:2023. Door release design and actuation categories. Check the approved site strategy.",
    "locator": "Guidance update on BS 7273-4:2015+A2:2023. Door release design and actuation categories. Check the approved site strategy.",
    "url": "https://www.fia.uk.com/news/fia-releases-updated-guidance-on-bs-7273-4-2015-a2-2023.html",
    "provenance": "User-supplied research register, FINDR brief v1.0, 2 November 2026",
    "verificationStatus": "reference-supplied",
    "numericComparatorEnabled": false
  },
  {
    "id": "S07",
    "title": "HSE",
    "description": "HSE | Electricity in potentially explosive atmospheres. Hazardous-area equipment and specialist approach.",
    "locator": "Electricity in potentially explosive atmospheres. Hazardous-area equipment and specialist approach.",
    "url": "https://www.hse.gov.uk/electricity/explosive.htm",
    "provenance": "User-supplied research register, FINDR brief v1.0, 2 November 2026",
    "verificationStatus": "reference-supplied",
    "numericComparatorEnabled": false
  },
  {
    "id": "S08",
    "title": "NSI",
    "description": "NSI | NACOSS Gold approval criteria, June 2024, scheme reference for intruder/hold-up alarms, electronic access control and CCTV. Context for PD 6662 / BS EN 50131 and applicable system-specific requirements, not a live numeric reference.",
    "locator": "NACOSS Gold approval criteria, June 2024, scheme reference for intruder/hold-up alarms, electronic access control and CCTV. Context for PD 6662 / BS EN 50131 and applicable system-specific requirements, not a live numeric reference.",
    "url": "https://www.nsi.org.uk/wp-content/uploads/2012/06/SF-002.8-NACOSS-Gold-approval-criteria-Jun-2024.pdf",
    "provenance": "User-supplied research register, FINDR brief v1.0, 2 November 2026",
    "verificationStatus": "reference-supplied",
    "numericComparatorEnabled": false
  },
  {
    "id": "S09",
    "title": "Electrical Safety First",
    "description": "Electrical Safety First | Best Practice Guide 2, issue 4.2, safe isolation procedures for low voltage installations. See “Proving dead” and indicator/proving sequence.",
    "locator": "Best Practice Guide 2, issue 4.2, safe isolation procedures for low voltage installations. See “Proving dead” and indicator/proving sequence.",
    "url": "https://www.electricalsafetyfirst.org.uk/media/btoiv1h5/best_practice-guide-2_issue-4-2.pdf",
    "provenance": "User-supplied research register, FINDR brief v1.0, 2 November 2026",
    "verificationStatus": "reference-supplied",
    "numericComparatorEnabled": false
  },
  {
    "id": "S10",
    "title": "ICO",
    "description": "ICO | Guidance on video surveillance (including CCTV). See access, retention, security and disclosure. Apply current organisational policy and applicable law when sharing evidence.",
    "locator": "Guidance on video surveillance (including CCTV). See access, retention, security and disclosure. Apply current organisational policy and applicable law when sharing evidence.",
    "url": "https://ico.org.uk/media/for-organisations/uk-gdpr-guidance-and-resources/cctv-and-video-surveillance/guidance-on-video-surveillance-including-cctv-1-0.pdf",
    "provenance": "User-supplied research register, FINDR brief v1.0, 2 November 2026",
    "verificationStatus": "reference-supplied",
    "numericComparatorEnabled": false
  },
  {
    "id": "S11",
    "title": "BSI",
    "description": "BSI | BS EN 60839-11-1, electronic access control system and components requirements. Scope includes recognition, indication, logging and communications.",
    "locator": "BS EN 60839-11-1, electronic access control system and components requirements. Scope includes recognition, indication, logging and communications.",
    "url": "https://knowledge.bsigroup.com/products/alarm-and-electronic-security-systems-electronic-access-control-systems-system-and-components-requirements",
    "provenance": "User-supplied research register, FINDR brief v1.0, 2 November 2026",
    "verificationStatus": "reference-supplied",
    "numericComparatorEnabled": false
  },
  {
    "id": "S12",
    "title": "BSI",
    "description": "BSI | BS EN IEC 62676-4:2025, video surveillance system application guidelines. Establish the site’s operational requirements and applicable edition.",
    "locator": "BS EN IEC 62676-4:2025, video surveillance system application guidelines. Establish the site’s operational requirements and applicable edition.",
    "url": "https://standardsdevelopment.bsigroup.com/projects/2024-00047",
    "provenance": "User-supplied research register, FINDR brief v1.0, 2 November 2026",
    "verificationStatus": "reference-supplied",
    "numericComparatorEnabled": false
  },
  {
    "id": "S13",
    "title": "BSI",
    "description": "BSI | PD 6662:2017, UK scheme for applying European intrusion and hold-up alarm standards. Confirm grade, agreed design and relevant equipment.",
    "locator": "PD 6662:2017, UK scheme for applying European intrusion and hold-up alarm standards. Confirm grade, agreed design and relevant equipment.",
    "url": "https://knowledge.bsigroup.com/products/scheme-for-the-application-of-european-standards-for-intrusion-and-hold-up-alarm-systems-1",
    "provenance": "User-supplied research register, FINDR brief v1.0, 2 November 2026",
    "verificationStatus": "reference-supplied",
    "numericComparatorEnabled": false
  },
  {
    "id": "P01",
    "title": "Elmdene",
    "description": "Elmdene | 2405ST, PAK200789_04A. Operating instructions, troubleshooting and diagnostic LED tables. Power/charger/battery/output indications are product-specific.",
    "locator": "2405ST, PAK200789_04A. Operating instructions, troubleshooting and diagnostic LED tables. Power/charger/battery/output indications are product-specific.",
    "url": "https://www.elmdene.co.uk/product/manual/PAK200789_04A_2405ST.pdf",
    "provenance": "User-supplied research register, FINDR brief v1.0, 2 November 2026",
    "verificationStatus": "reference-supplied",
    "numericComparatorEnabled": false
  },
  {
    "id": "P02",
    "title": "Yuasa UK",
    "description": "Yuasa UK | Battery installation, commissioning and maintenance guide. Commissioning, maintenance and discharge testing. Match battery type and duty.",
    "locator": "Battery installation, commissioning and maintenance guide. Commissioning, maintenance and discharge testing. Match battery type and duty.",
    "url": "https://www.yuasa.com/uk/info-hub/battery-installation-commissioning-and-maintenance-guide",
    "provenance": "User-supplied research register, FINDR brief v1.0, 2 November 2026",
    "verificationStatus": "reference-supplied",
    "numericComparatorEnabled": false
  },
  {
    "id": "P03",
    "title": "Fluke",
    "description": "Fluke | Models 15B/17B user manual, Making Measurements, pp. 5–7. Voltage/current/resistance/continuity methods and energy-state precautions. Meter-specific buzzer threshold.",
    "locator": "Models 15B/17B user manual, Making Measurements, pp. 5–7. Voltage/current/resistance/continuity methods and energy-state precautions. Meter-specific buzzer threshold.",
    "url": "https://assets.fluke.com/manuals/15b17b__umeng0300.pdf",
    "provenance": "User-supplied research register, FINDR brief v1.0, 2 November 2026",
    "verificationStatus": "reference-supplied",
    "numericComparatorEnabled": false
  },
  {
    "id": "P04",
    "title": "Fluke Networks",
    "description": "Fluke Networks | MicroScanner2, Twisted pair test results. Wiremap, pair errors and cable fault location. Cable qualification/certification requires appropriate additional testing.",
    "locator": "MicroScanner2, Twisted pair test results. Wiremap, pair errors and cable fault location. Cable qualification/certification requires appropriate additional testing.",
    "url": "https://www.flukenetworks.com/knowledge-base/microscanner2/twisted-pair-test-results-microscanner2",
    "provenance": "User-supplied research register, FINDR brief v1.0, 2 November 2026",
    "verificationStatus": "reference-supplied",
    "numericComparatorEnabled": false
  },
  {
    "id": "P05",
    "title": "Fluke Networks",
    "description": "Fluke Networks | MicroScanner2, Testing coaxial cabling. Open, short and termination-dependent indications.",
    "locator": "MicroScanner2, Testing coaxial cabling. Open, short and termination-dependent indications.",
    "url": "https://www.flukenetworks.com/knowledge-base/microscanner2/testing-coaxial-cabling-microscanner2",
    "provenance": "User-supplied research register, FINDR brief v1.0, 2 November 2026",
    "verificationStatus": "reference-supplied",
    "numericComparatorEnabled": false
  },
  {
    "id": "F01",
    "title": "C-TEC",
    "description": "C-TEC | CFP Standard Engineers Manual, DFU7004010. Detector/sounder wiring and fault diagnosis. See printed pp. 7–8 and 19 onwards. Match the exact CFP version.",
    "locator": "CFP Standard Engineers Manual, DFU7004010. Detector/sounder wiring and fault diagnosis. See printed pp. 7–8 and 19 onwards. Match the exact CFP version.",
    "url": "https://c-tec.com/download?wpdmdl=13537",
    "provenance": "User-supplied research register, FINDR brief v1.0, 2 November 2026",
    "verificationStatus": "reference-supplied",
    "numericComparatorEnabled": false
  },
  {
    "id": "F02",
    "title": "Apollo Fire Detectors",
    "description": "Apollo Fire Detectors | Apollo Test Set User Manual, PP2625, issue 4. Device/loop tests, test-set supplies and Earth fault location search. Observe protocol and isolator limits.",
    "locator": "Apollo Test Set User Manual, PP2625, issue 4. Device/loop tests, test-set supplies and Earth fault location search. Observe protocol and isolator limits.",
    "url": "https://www.apollo-fire.co.uk/globalassets/downloadable-content/pp2625_apollo-test-set-user-manual_issue-4.pdf",
    "provenance": "User-supplied research register, FINDR brief v1.0, 2 November 2026",
    "verificationStatus": "reference-supplied",
    "numericComparatorEnabled": false
  },
  {
    "id": "F03",
    "title": "Advanced",
    "description": "Advanced | MxPro 5 product manual, 680-165, distributor-hosted manufacturer copy. §§3.3.2–3.3.7 for device/history/loop meter/scope. Output groups and logic in §3.3.20. Check current hardware/manual before shipping.",
    "locator": "MxPro 5 product manual, 680-165, distributor-hosted manufacturer copy. §§3.3.2–3.3.7 for device/history/loop meter/scope. Output groups and logic in §3.3.20. Check current hardware/manual before shipping.",
    "url": "https://www.eufireandsecurity.com/wp-content/uploads/2025/03/MxPro5-Product-Manual.pdf",
    "provenance": "User-supplied research register, FINDR brief v1.0, 2 November 2026",
    "verificationStatus": "reference-supplied",
    "numericComparatorEnabled": false
  },
  {
    "id": "F04",
    "title": "Gent by Honeywell",
    "description": "Gent by Honeywell | Vigilon commissioning instructions, 4188-856, UK GentExpert technical resource. See “Checking a loop map” and loop break fault descriptions. Variant/card differences matter.",
    "locator": "Vigilon commissioning instructions, 4188-856, UK GentExpert technical resource. See “Checking a loop map” and loop break fault descriptions. Variant/card differences matter.",
    "url": "https://www.gentexpert.co.uk/downloads/Addressable/Vigilon/VIG1-24_72/4188-856.pdf",
    "provenance": "User-supplied research register, FINDR brief v1.0, 2 November 2026",
    "verificationStatus": "reference-supplied",
    "numericComparatorEnabled": false
  },
  {
    "id": "F05",
    "title": "Xtralis",
    "description": "Xtralis | VESDA-E VEP-A10-P Product Guide, 22071 rev 16, distributor-hosted manufacturer document. Airflow screen, §8 troubleshooting and appendix A commissioning records.",
    "locator": "VESDA-E VEP-A10-P Product Guide, 22071 rev 16, distributor-hosted manufacturer document. Airflow screen, §8 troubleshooting and appendix A commissioning records.",
    "url": "https://eurofyre.co.uk/wp-content/uploads/2023/10/22071_16_VESDA-E_VEP-A10-P_Product_Guide_A4_IE_lores.pdf",
    "provenance": "User-supplied research register, FINDR brief v1.0, 2 November 2026",
    "verificationStatus": "reference-supplied",
    "numericComparatorEnabled": false
  },
  {
    "id": "F06",
    "title": "Fire Industry Association",
    "description": "Fire Industry Association | Design, Installation, Commissioning & Maintenance of Aspirating Smoke Detection Systems. See sampling points, testing, transport time and maintenance. Legacy guidance. Prefer current site/model procedure for actual tests.",
    "locator": "Design, Installation, Commissioning & Maintenance of Aspirating Smoke Detection Systems. See sampling points, testing, transport time and maintenance. Legacy guidance. Prefer current site/model procedure for actual tests.",
    "url": "https://fia.uk.com/static/uploaded/440ce5b2-6824-4fdb-ab20a887f80722d6.pdf",
    "provenance": "User-supplied research register, FINDR brief v1.0, 2 November 2026",
    "verificationStatus": "reference-supplied",
    "numericComparatorEnabled": false
  },
  {
    "id": "F07",
    "title": "FFE",
    "description": "FFE | Fireray One User Guide, 0044-092. Alignment, operation, status indications and troubleshooting. Select matching detector and guide.",
    "locator": "Fireray One User Guide, 0044-092. Alignment, operation, status indications and troubleshooting. Select matching detector and guide.",
    "url": "https://ffeuk.com/hubfs/FFE%20Literature%20-%20New/Fireray/Fireray%20One/User%20Guides/0044-092_Fireray_One_User_Guide_%28EN%29.pdf?hsLang=en",
    "provenance": "User-supplied research register, FINDR brief v1.0, 2 November 2026",
    "verificationStatus": "reference-supplied",
    "numericComparatorEnabled": false
  },
  {
    "id": "F08",
    "title": "Hyfire",
    "description": "Hyfire | TauREX user manual. Wireless topology, device status, radio/link quality and maintenance views. Use the returned document version with the installed Taurus equipment.",
    "locator": "TauREX user manual. Wireless topology, device status, radio/link quality and maintenance views. Use the returned document version with the installed Taurus equipment.",
    "url": "https://hyfirewireless.com/wp-content/uploads/2022/05/L20-TAUEX-1400-P.2-TAUREX-User-Manual-Hyfire.pdf",
    "provenance": "User-supplied research register, FINDR brief v1.0, 2 November 2026",
    "verificationStatus": "reference-supplied",
    "numericComparatorEnabled": false
  },
  {
    "id": "F09",
    "title": "North Yorkshire Fire & Rescue Service",
    "description": "North Yorkshire Fire & Rescue Service | Common causes of false alarms. Environmental sources for unwanted alarm investigation.",
    "locator": "Common causes of false alarms. Environmental sources for unwanted alarm investigation.",
    "url": "https://www.northyorksfire.gov.uk/business-safety/reducing-false-alarms/common-causes/",
    "provenance": "User-supplied research register, FINDR brief v1.0, 2 November 2026",
    "verificationStatus": "reference-supplied",
    "numericComparatorEnabled": false
  },
  {
    "id": "F10",
    "title": "Apollo",
    "description": "Apollo | XP95 negative isolator 55000-720APO. Short-circuit isolation and recovery. Applies to this product, not every isolator type.",
    "locator": "XP95 negative isolator 55000-720APO. Short-circuit isolation and recovery. Applies to this product, not every isolator type.",
    "url": "https://apollo-fire.co.uk/products/xp95/isolator/55000-720apo-isolator-negative/",
    "provenance": "User-supplied research register, FINDR brief v1.0, 2 November 2026",
    "verificationStatus": "reference-supplied",
    "numericComparatorEnabled": false
  },
  {
    "id": "F11",
    "title": "C-TEC",
    "description": "C-TEC | CFP AlarmSense fire panel installation and maintenance manual. Two-wire zone behaviour and conventional sounder diagnostics. Compare with CFP Standard [REF F01].",
    "locator": "CFP AlarmSense fire panel installation and maintenance manual. Two-wire zone behaviour and conventional sounder diagnostics. Compare with CFP Standard [REF F01].",
    "url": "https://c-tec.com/download?wpdmdl=12203",
    "provenance": "User-supplied research register, FINDR brief v1.0, 2 November 2026",
    "verificationStatus": "reference-supplied",
    "numericComparatorEnabled": false
  },
  {
    "id": "A01",
    "title": "Paxton",
    "description": "Paxton | Net2 APN-1086, lock with independent power supply. Voltage-free relay, external supply and switched-return wiring example.",
    "locator": "Net2 APN-1086, lock with independent power supply. Voltage-free relay, external supply and switched-return wiring example.",
    "url": "https://www.paxton-access.com/wp-content/uploads/2019/03/AN1086.pdf",
    "provenance": "User-supplied research register, FINDR brief v1.0, 2 November 2026",
    "verificationStatus": "reference-supplied",
    "numericComparatorEnabled": false
  },
  {
    "id": "A02",
    "title": "Paxton",
    "description": "Paxton | Net2 APN-1059-AE, valid token denied access. Token indication, events, authorisation and door operation. Supplement with locally applicable variant.",
    "locator": "Net2 APN-1059-AE, valid token denied access. Token indication, events, authorisation and door operation. Supplement with locally applicable variant.",
    "url": "https://www.paxton-access.com/wp-content/uploads/2020/01/AN1059-AE.pdf",
    "provenance": "User-supplied research register, FINDR brief v1.0, 2 November 2026",
    "verificationStatus": "reference-supplied",
    "numericComparatorEnabled": false
  },
  {
    "id": "A03",
    "title": "Paxton",
    "description": "Paxton | Net2 APN-1061, ACUs not responding on RS485. See “Testing the Data Line”, isolation requirements and separate cable-dependent ranges.",
    "locator": "Net2 APN-1061, ACUs not responding on RS485. See “Testing the Data Line”, isolation requirements and separate cable-dependent ranges.",
    "url": "https://www.paxton-access.com/wp-content/uploads/2019/03/AN1061.pdf",
    "provenance": "User-supplied research register, FINDR brief v1.0, 2 November 2026",
    "verificationStatus": "reference-supplied",
    "numericComparatorEnabled": false
  },
  {
    "id": "A04",
    "title": "Paxton",
    "description": "Paxton | Net2 APN-1031, integration with a fire alarm. Inputs, selected doors and dependency on running server for this software feature.",
    "locator": "Net2 APN-1031, integration with a fire alarm. Inputs, selected doors and dependency on running server for this software feature.",
    "url": "https://www.paxton-access.com/wp-content/uploads/2019/03/AN1031.pdf",
    "provenance": "User-supplied research register, FINDR brief v1.0, 2 November 2026",
    "verificationStatus": "reference-supplied",
    "numericComparatorEnabled": false
  },
  {
    "id": "A05",
    "title": "Paxton",
    "description": "Paxton | APN-1090, advice on access control for fire exits. Separate physical means of escape/emergency release from controller logic. Site fire strategy remains essential.",
    "locator": "APN-1090, advice on access control for fire exits. Separate physical means of escape/emergency release from controller logic. Site fire strategy remains essential.",
    "url": "https://www.paxton-access.com/wp-content/uploads/2019/03/AN1090.pdf",
    "provenance": "User-supplied research register, FINDR brief v1.0, 2 November 2026",
    "verificationStatus": "reference-supplied",
    "numericComparatorEnabled": false
  },
  {
    "id": "A06",
    "title": "Axis",
    "description": "Axis | AXIS A4030-E Reader technical documentation. Reader configuration and OSDP capabilities. Check the selected reader/controller.",
    "locator": "AXIS A4030-E Reader technical documentation. Reader configuration and OSDP capabilities. Check the selected reader/controller.",
    "url": "https://help.axis.com/en-us/axis-a4030-e",
    "provenance": "User-supplied research register, FINDR brief v1.0, 2 November 2026",
    "verificationStatus": "reference-supplied",
    "numericComparatorEnabled": false
  },
  {
    "id": "A07",
    "title": "Paxton",
    "description": "Paxton | Net2 plus control unit instructions, distributor-hosted manufacturer document. ACU/reader/input/relay and communications. Legacy hardware example.",
    "locator": "Net2 plus control unit instructions, distributor-hosted manufacturer document. ACU/reader/input/relay and communications. Legacy hardware example.",
    "url": "https://www.ukwatchsecurity.co.uk/engineer-manuals/Manuals/Paxton%20Net2%2B.pdf",
    "provenance": "User-supplied research register, FINDR brief v1.0, 2 November 2026",
    "verificationStatus": "reference-supplied",
    "numericComparatorEnabled": false
  },
  {
    "id": "A08",
    "title": "Axis",
    "description": "Axis | Why choose OSDP over Wiegand in access control? Technology differences, supervision and secure channel. Not a site wiring diagram.",
    "locator": "Why choose OSDP over Wiegand in access control? Technology differences, supervision and secure channel. Not a site wiring diagram.",
    "url": "https://www.axis.com/dam/public/50/2e/5a/white-paper-why-choose-osdp-over-wiegand-in-access-control-en-US-485168.pdf",
    "provenance": "User-supplied research register, FINDR brief v1.0, 2 November 2026",
    "verificationStatus": "reference-supplied",
    "numericComparatorEnabled": false
  },
  {
    "id": "C01",
    "title": "Axis",
    "description": "Axis | Typical and maximum power consumption in Axis cameras. Configuration, IR, motors, heaters and worst-case power.",
    "locator": "Typical and maximum power consumption in Axis cameras. Configuration, IR, motors, heaters and worst-case power.",
    "url": "https://whitepapers.axis.com/en-us/typical-and-maximum-power-consumption-in-axis-cameras",
    "provenance": "User-supplied research register, FINDR brief v1.0, 2 November 2026",
    "verificationStatus": "reference-supplied",
    "numericComparatorEnabled": false
  },
  {
    "id": "C02",
    "title": "Cisco",
    "description": "Cisco | Troubleshooting Power over Ethernet (PoE), Catalyst troubleshooting guide. Individual port, budget and device/cabling comparisons. Commands are platform-specific.",
    "locator": "Troubleshooting Power over Ethernet (PoE), Catalyst troubleshooting guide. Individual port, budget and device/cabling comparisons. Commands are platform-specific.",
    "url": "https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst3750/software/troubleshooting/g_power_over_ethernet.html",
    "provenance": "User-supplied research register, FINDR brief v1.0, 2 November 2026",
    "verificationStatus": "reference-supplied",
    "numericComparatorEnabled": false
  },
  {
    "id": "C03",
    "title": "Hikvision",
    "description": "Hikvision | Network Abnormal in NVR camera management. IP, addressability and NVR-side network setup. Exact recorder error and model determine the route.",
    "locator": "Network Abnormal in NVR camera management. IP, addressability and NVR-side network setup. Exact recorder error and model determine the route.",
    "url": "https://supportusa.hikvision.com/support/solutions/articles/17000129444-why-is-the-ip-camera-showing-network-abnormal-on-my-nvr-camera-management-screen-/",
    "provenance": "User-supplied research register, FINDR brief v1.0, 2 November 2026",
    "verificationStatus": "reference-supplied",
    "numericComparatorEnabled": false
  },
  {
    "id": "C04",
    "title": "Axis",
    "description": "Axis | Troubleshooting guide for network connection. Bandwidth, network troubleshooting and evidence for support.",
    "locator": "Troubleshooting guide for network connection. Bandwidth, network troubleshooting and evidence for support.",
    "url": "https://help.axis.com/en-us/troubleshooting-network",
    "provenance": "User-supplied research register, FINDR brief v1.0, 2 November 2026",
    "verificationStatus": "reference-supplied",
    "numericComparatorEnabled": false
  },
  {
    "id": "C05",
    "title": "Axis",
    "description": "Axis | AXIS Camera Station 5 troubleshooting guide. Recording gaps, disappearing recordings, storage and playback. Generalise diagnostic layers only. Interface names belong to that product.",
    "locator": "AXIS Camera Station 5 troubleshooting guide. Recording gaps, disappearing recordings, storage and playback. Generalise diagnostic layers only. Interface names belong to that product.",
    "url": "https://help.axis.com/en-us/axis-camera-station-troubleshooting-guide",
    "provenance": "User-supplied research register, FINDR brief v1.0, 2 November 2026",
    "verificationStatus": "reference-supplied",
    "numericComparatorEnabled": false
  },
  {
    "id": "C06",
    "title": "Hikvision",
    "description": "Hikvision | How to troubleshoot an analog camera. Source format, DVR compatibility, local testing and channel/cable comparisons.",
    "locator": "How to troubleshoot an analog camera. Source format, DVR compatibility, local testing and channel/cable comparisons.",
    "url": "https://supportusa.hikvision.com/support/solutions/articles/17000129936-how-to-troubleshoot-my-analog-camera-",
    "provenance": "User-supplied research register, FINDR brief v1.0, 2 November 2026",
    "verificationStatus": "reference-supplied",
    "numericComparatorEnabled": false
  },
  {
    "id": "C07",
    "title": "Axis",
    "description": "Axis | Troubleshooting guide for image quality. Exposure, noise, IR reflections, lighting and optical effects.",
    "locator": "Troubleshooting guide for image quality. Exposure, noise, IR reflections, lighting and optical effects.",
    "url": "https://help.axis.com/en-us/troubleshooting-image-quality",
    "provenance": "User-supplied research register, FINDR brief v1.0, 2 November 2026",
    "verificationStatus": "reference-supplied",
    "numericComparatorEnabled": false
  },
  {
    "id": "C08",
    "title": "Axis",
    "description": "Axis | AXIS Q1800-LE License Plate Camera user manual. Mounting, capture conditions and licence plate recognition troubleshooting.",
    "locator": "AXIS Q1800-LE License Plate Camera user manual. Mounting, capture conditions and licence plate recognition troubleshooting.",
    "url": "https://help.axis.com/en-us/axis-q1800-le",
    "provenance": "User-supplied research register, FINDR brief v1.0, 2 November 2026",
    "verificationStatus": "reference-supplied",
    "numericComparatorEnabled": false
  },
  {
    "id": "C09",
    "title": "Axis",
    "description": "Axis | P5515-E PTZ user manual for firmware prior to 7.20. Troubleshooting PTZ control and motor power (p. 58). Legacy model example.",
    "locator": "P5515-E PTZ user manual for firmware prior to 7.20. Troubleshooting PTZ control and motor power (p. 58). Legacy model example.",
    "url": "https://www.axis.com/dam/public/03/9f/20/axis-p5515-e--user-manual-prior-to-720-en-US-104889.pdf",
    "provenance": "User-supplied research register, FINDR brief v1.0, 2 November 2026",
    "verificationStatus": "reference-supplied",
    "numericComparatorEnabled": false
  },
  {
    "id": "I01",
    "title": "Texecom",
    "description": "Texecom | Premier Elite Series Installation Manual INS176-15. Zone circuits (p. 32), zone wiring (p. 60), engineer utilities/View Zone Status and expander/radio diagnostics. Match panel and firmware.",
    "locator": "Premier Elite Series Installation Manual INS176-15. Zone circuits (p. 32), zone wiring (p. 60), engineer utilities/View Zone Status and expander/radio diagnostics. Match panel and firmware.",
    "url": "https://branding.texe.com/uk/uploads/INS176-15_Premier_Elite_Series_Installation_Manual_4.pdf",
    "provenance": "User-supplied research register, FINDR brief v1.0, 2 November 2026",
    "verificationStatus": "reference-supplied",
    "numericComparatorEnabled": false
  },
  {
    "id": "I02",
    "title": "Honeywell",
    "description": "Honeywell | Galaxy Dimension Installer Manual, distributor-hosted manufacturer copy. Zone wiring, tables 2-7/2-8, Display Zones option 21, parameter 51.46 and per-zone resistance settings. Verify model/RIO revision.",
    "locator": "Galaxy Dimension Installer Manual, distributor-hosted manufacturer copy. Zone wiring, tables 2-7/2-8, Display Zones option 21, parameter 51.46 and per-zone resistance settings. Verify model/RIO revision.",
    "url": "https://www.ukwatchsecurity.co.uk/engineer-manuals/Manuals/Galaxy%20Dimension%20Install%20Manual.pdf",
    "provenance": "User-supplied research register, FINDR brief v1.0, 2 November 2026",
    "verificationStatus": "reference-supplied",
    "numericComparatorEnabled": false
  },
  {
    "id": "I03",
    "title": "Pyronix",
    "description": "Pyronix | KX15DT installation guide, RINS549-14. Device terminals, EOL links, local indications and walk test.",
    "locator": "KX15DT installation guide, RINS549-14. Device terminals, EOL links, local indications and walk test.",
    "url": "https://www.pyronix.com/wp-content/uploads/sites/2/2018/06/KX15DT-Installation-Guide.pdf",
    "provenance": "User-supplied research register, FINDR brief v1.0, 2 November 2026",
    "verificationStatus": "reference-supplied",
    "numericComparatorEnabled": false
  },
  {
    "id": "I04",
    "title": "CSL",
    "description": "CSL | DualCom Pro 2 Range installation manual. Testing section and fire input/restore signalling. Record what the receiving centre actually received.",
    "locator": "DualCom Pro 2 Range installation manual. Testing section and fire input/restore signalling. Record what the receiving centre actually received.",
    "url": "https://www.csl-group.com/data/manuals/52848/dualcom-pro-2-range.pdf",
    "provenance": "User-supplied research register, FINDR brief v1.0, 2 November 2026",
    "verificationStatus": "reference-supplied",
    "numericComparatorEnabled": false
  },
  {
    "id": "I05",
    "title": "Pyronix",
    "description": "Pyronix | Enforcer UK programming manual, RINS1904. Radio diagnostics, input/bell signal strength and event/setting context. Use matched firmware.",
    "locator": "Enforcer UK programming manual, RINS1904. Radio diagnostics, input/bell signal strength and event/setting context. Use matched firmware.",
    "url": "https://www.pyronix.com/wp-content/uploads/sites/2/2017/10/downloads/995.pdf",
    "provenance": "User-supplied research register, FINDR brief v1.0, 2 November 2026",
    "verificationStatus": "reference-supplied",
    "numericComparatorEnabled": false
  },
  {
    "id": "I06",
    "title": "Texecom",
    "description": "Texecom | Premier Elite Odyssey 5. SAB/SCB modes, hold-off and tamper. Use installation guide for actual terminals and safe service steps.",
    "locator": "Premier Elite Odyssey 5. SAB/SCB modes, hold-off and tamper. Use installation guide for actual terminals and safe service steps.",
    "url": "https://www.texe.com/products/premier-elite-odyssey-5/",
    "provenance": "User-supplied research register, FINDR brief v1.0, 2 November 2026",
    "verificationStatus": "reference-supplied",
    "numericComparatorEnabled": false
  },
  {
    "id": "I07",
    "title": "Pyronix",
    "description": "Pyronix | KX15DTAM installation guide. Mask, alarm, fault/EOL links and LED states. Distinguish it from the non-AM KX15DT.",
    "locator": "KX15DTAM installation guide. Mask, alarm, fault/EOL links and LED states. Distinguish it from the non-AM KX15DT.",
    "url": "https://www.pyronix.com/wp-content/uploads/sites/2/2018/06/KX15DTAM-Installation-Guide.pdf",
    "provenance": "User-supplied research register, FINDR brief v1.0, 2 November 2026",
    "verificationStatus": "reference-supplied",
    "numericComparatorEnabled": false
  }
];
export const TEST_TEMPLATES = [
  {
    "id": "observation",
    "title": "Observation",
    "testKind": "observation",
    "fields": [
      "What was observed",
      "Point / asset",
      "Time",
      "Witness/source"
    ],
    "requires": [
      "readOnly"
    ],
    "reviewStatus": "generic-reviewed",
    "numericComparatorsEnabled": false
  },
  {
    "id": "display",
    "title": "Panel / event history",
    "testKind": "panel_display",
    "fields": [
      "Exact words / code",
      "Displayed time",
      "Clock offset",
      "Asset / input"
    ],
    "requires": [
      "readOnly"
    ],
    "reviewStatus": "generic-reviewed",
    "numericComparatorsEnabled": false
  },
  {
    "id": "voltage",
    "title": "Voltage across identified points",
    "testKind": "device_terminal_voltage",
    "fields": [
      "Point A",
      "Point B / reference",
      "Raw value",
      "Unit",
      "Circuit state",
      "Load state",
      "Instrument"
    ],
    "requires": [
      "energised",
      "instrument"
    ],
    "reviewStatus": "generic-reviewed",
    "numericComparatorsEnabled": false
  },
  {
    "id": "voltage_drop",
    "title": "Comparable source / load readings",
    "testKind": "voltage_drop",
    "fields": [
      "Source pair",
      "Load pair",
      "Raw values",
      "Unit",
      "Shared source",
      "Matching load state",
      "Timestamps"
    ],
    "requires": [
      "energised",
      "instrument"
    ],
    "reviewStatus": "generic-reviewed",
    "numericComparatorsEnabled": false
  },
  {
    "id": "resistance",
    "title": "Resistance on an identified isolated span",
    "testKind": "resistance",
    "fields": [
      "Both ends",
      "Probe pair",
      "Raw value / OL",
      "Unit",
      "Isolation evidence",
      "Attached components",
      "Instrument"
    ],
    "requires": [
      "isolation",
      "bothEnds",
      "instrument"
    ],
    "reviewStatus": "generic-reviewed",
    "numericComparatorsEnabled": false
  },
  {
    "id": "continuity",
    "title": "Individual conductor continuity",
    "testKind": "continuity",
    "fields": [
      "Individual conductor",
      "Both ends",
      "Far-end disposition",
      "Raw result",
      "Isolated bare span",
      "Lead compensation"
    ],
    "requires": [
      "isolation",
      "bothEnds",
      "bareSpan",
      "instrument"
    ],
    "reviewStatus": "generic-reviewed",
    "numericComparatorsEnabled": false
  },
  {
    "id": "contact",
    "title": "Contact / input transition",
    "testKind": "contact_transition",
    "fields": [
      "Physical action",
      "Input or contact",
      "State before",
      "State after",
      "Method",
      "Time"
    ],
    "requires": [
      "impairment"
    ],
    "reviewStatus": "generic-reviewed",
    "numericComparatorsEnabled": false
  },
  {
    "id": "functional",
    "title": "Functional response",
    "testKind": "functional_activation",
    "fields": [
      "Approved function",
      "Initiating event",
      "Actual end response",
      "Witness",
      "Time",
      "Restoration"
    ],
    "requires": [
      "impairment"
    ],
    "reviewStatus": "generic-reviewed",
    "numericComparatorsEnabled": false
  },
  {
    "id": "poe",
    "title": "PoE / port diagnostics",
    "testKind": "poe",
    "fields": [
      "Port / camera",
      "Power allocation",
      "Demand source",
      "Budget",
      "Link state",
      "Time"
    ],
    "requires": [
      "readOnly"
    ],
    "reviewStatus": "generic-reviewed",
    "numericComparatorsEnabled": false
  },
  {
    "id": "network",
    "title": "Network / stream evidence",
    "testKind": "network",
    "fields": [
      "Actual path / port",
      "Supported diagnostic",
      "Exact state/error",
      "Local/remote comparison",
      "Time"
    ],
    "requires": [
      "readOnly"
    ],
    "reviewStatus": "generic-reviewed",
    "numericComparatorsEnabled": false
  },
  {
    "id": "playback",
    "title": "Playback / export verification",
    "testKind": "playback",
    "fields": [
      "Channel / camera",
      "Known event time",
      "Search window / clock offset",
      "Actual playback result",
      "Destination"
    ],
    "requires": [
      "readOnly"
    ],
    "reviewStatus": "generic-reviewed",
    "numericComparatorsEnabled": false
  },
  {
    "id": "proving_dead",
    "title": "Record a proving-dead sequence",
    "testKind": "proving_dead",
    "fields": [
      "All sources",
      "Isolation and securing",
      "Point of work",
      "Indicator / proving method",
      "Proof before",
      "Individual conductor pairs",
      "Proof after"
    ],
    "requires": [
      "isolation",
      "instrument"
    ],
    "reviewStatus": "generic-reviewed",
    "numericComparatorsEnabled": false
  },
  {
    "id": "battery",
    "title": "Battery / standby evidence",
    "testKind": "battery",
    "fields": [
      "Battery units / string",
      "Chemistry and capacity",
      "Condition",
      "Method",
      "Actual result",
      "Load state",
      "Source"
    ],
    "requires": [
      "instrument",
      "impairment"
    ],
    "reviewStatus": "generic-reviewed",
    "numericComparatorsEnabled": false
  },
  {
    "id": "airflow",
    "title": "Displayed pipe airflow",
    "testKind": "airflow",
    "fields": [
      "Detector / pipe",
      "Raw displayed value",
      "Unit",
      "Commissioned baseline",
      "Current state",
      "Time"
    ],
    "requires": [
      "readOnly"
    ],
    "reviewStatus": "generic-reviewed",
    "numericComparatorsEnabled": false
  },
  {
    "id": "custom",
    "title": "My own test / observation",
    "testKind": "custom",
    "fields": [
      "What was tested",
      "Point / asset",
      "Result or unavailable reason",
      "State",
      "Time"
    ],
    "requires": [
      "readOnly"
    ],
    "reviewStatus": "generic-reviewed",
    "numericComparatorsEnabled": false
  }
];
export const FIELD_ROUTES = [
  {
    "id": "P01",
    "title": "Equipment dead or “mains fail”",
    "sourceBrief": "Ask whether the head unit is dark, has switched to standby battery, reports an AC failure, or only one output has failed. Log clocked events, other loads on the same supply, isolator label/status where safely visible, PSU indicators, separate input and output channels and secondary sources. If the unit is on battery, investigate incoming supply and its monitoring before calling the whole PSU dead. If one output fails while another works, go to P03. If access to mains is unauthorised, record “input unverified”, the safe-side observations and electrical referral. [REF S01–S03, P01]",
    "systems": [
      "shared"
    ],
    "sourceRefs": [
      "S01",
      "S02",
      "S03",
      "P01"
    ],
    "summary": "Ask whether the head unit is dark, has switched to standby battery, reports an AC failure, or only one output has failed.",
    "revision": "2026-11-02.1",
    "reviewStatus": "generic-reviewed",
    "provenance": "Adapted from user-supplied FINDR research and implementation brief v1.0; question order is FINDR product design, not a manufacturer procedure.",
    "sourceBriefStatus": "Supplied research text. Model-specific examples require separate verification and are not enabled comparators.",
    "rules": [
      {
        "id": "P01.Q1",
        "revision": "2026-11-02.1",
        "routeId": "P01",
        "family": "P",
        "question": "Is the head unit operating from its standby battery now?",
        "why": "Standby operation separates an incoming-supply report from a completely dead unit.",
        "testTemplate": "display",
        "evidenceToCollect": [
          "Exact mains/battery indication",
          "Event time and clock source",
          "Current unit state"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "P01.Q2",
        "noTarget": "P01.Q3",
        "unknownTarget": "P01.Q2",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "S01",
          "S02",
          "S03",
          "P01"
        ]
      },
      {
        "id": "P01.Q2",
        "revision": "2026-11-02.1",
        "routeId": "P01",
        "family": "P",
        "question": "Is an incoming-supply failure recorded in the unit's event history?",
        "why": "The first clocked indication is stronger evidence than calling the whole PSU dead.",
        "testTemplate": "display",
        "evidenceToCollect": [
          "Original failure and restore text",
          "Other loads affected",
          "Visible isolator and PSU indicators"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "P02",
        "noTarget": "P01.Q3",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "S01",
          "S02",
          "S03",
          "P01"
        ]
      },
      {
        "id": "P01.Q3",
        "revision": "2026-11-02.1",
        "routeId": "P01",
        "family": "P",
        "question": "Does another protected output on this same source still operate?",
        "why": "One failed output directs the investigation to that channel or path rather than every connected device.",
        "testTemplate": "observation",
        "evidenceToCollect": [
          "Working output identity",
          "Failed output identity",
          "Source and secondary supplies"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "P03",
        "noTarget": "P05",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "S01",
          "S02",
          "S03",
          "P01"
        ]
      }
    ],
    "closeout": [
      "If access to mains is unauthorised, record “input unverified”, the safe-side observations and electrical referral.",
      "Keep the incident outcome separate from restoration; retain unresolved evidence and the named next action."
    ]
  },
  {
    "id": "P02",
    "title": "Authorised mains verification or a recorded safe isolation",
    "sourceBrief": "Select the task the competent person is performing. Options are diagnostic verification on an energised single-phase input, or proving dead after isolation. Log terminal/location, L–N, L–PE, N–PE individually, indication or actual V AC, supply state, test device and separate authority/proving record. Unexpected results, including an unexpected potential to PE, require competent investigation. Do not identify a lost neutral or good earth solely from this pattern. Low N–PE is not proof of protective-conductor continuity. Never infer safe isolation from three previously typed values. For a confirmed suitable input with DC output absent under the specified condition, follow P03. For unresolved input safety, stop the mains branch. [REF S01–S03, S09, P01]",
    "systems": [
      "shared"
    ],
    "sourceRefs": [
      "S01",
      "S02",
      "S03",
      "S09",
      "P01"
    ],
    "summary": "Select the task the competent person is performing.",
    "revision": "2026-11-02.1",
    "reviewStatus": "generic-reviewed",
    "provenance": "Adapted from user-supplied FINDR research and implementation brief v1.0; question order is FINDR product design, not a manufacturer procedure.",
    "sourceBriefStatus": "Supplied research text. Model-specific examples require separate verification and are not enabled comparators.",
    "rules": [
      {
        "id": "P02.Q1",
        "revision": "2026-11-02.1",
        "routeId": "P02",
        "family": "P",
        "question": "Is this record for proving dead after an approved isolation?",
        "why": "Diagnostic energised readings and proving dead are different tasks and cannot satisfy each other.",
        "testTemplate": "observation",
        "evidenceToCollect": [
          "Selected task",
          "Point of work",
          "All possible sources"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "P02.Q2",
        "noTarget": "P02.Q3",
        "unknownTarget": "handover",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "S01",
          "S02",
          "S03",
          "S09",
          "P01"
        ]
      },
      {
        "id": "P02.Q2",
        "revision": "2026-11-02.1",
        "routeId": "P02",
        "family": "P",
        "question": "Was the voltage indicator successfully proved again after the point-of-work checks?",
        "why": "An unsuccessful final proof invalidates the proof sequence even when earlier pairs indicated absence.",
        "testTemplate": "proving_dead",
        "evidenceToCollect": [
          "Indicator and proving method",
          "Proof before and after",
          "L–N, L–PE and N–PE individually",
          "Batteries and alternate sources"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "isolation",
          "instrument"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "handover",
        "noTarget": "handover",
        "unknownTarget": "handover",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T1",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "S01",
          "S02",
          "S03",
          "S09",
          "P01"
        ]
      },
      {
        "id": "P02.Q3",
        "revision": "2026-11-02.1",
        "routeId": "P02",
        "family": "P",
        "question": "Does an existing authorised input measurement document the required supply state at this point?",
        "why": "A recorded input condition can guide a DC-output investigation but cannot prove safe isolation or PE continuity.",
        "testTemplate": "voltage",
        "evidenceToCollect": [
          "Actual probe pairs",
          "V AC values or not tested",
          "Time and operating state",
          "Independent authority record"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "energised",
          "instrument"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "P03",
        "noTarget": "handover",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T1",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "S01",
          "S02",
          "S03",
          "S09",
          "P01"
        ]
      }
    ],
    "closeout": [
      "For unresolved input safety, stop the mains branch.",
      "Keep the incident outcome separate from restoration; retain unresolved evidence and the named next action."
    ]
  },
  {
    "id": "P03",
    "title": "Supply present at source, load dead or resets",
    "sourceBrief": "Ask for rated output and actual loaded voltage at the correct PSU +/− and equipment +/− during the same condition, plus each protected output indicator. Record local references, output channel, fuses/status, polarity, stalled/idle/activated state, other branches sharing the output and evidence of intermittent reset. If source and load both sag, investigate common supply, overload or a dragging branch under the manufacturer’s procedure. If source holds but load falls, narrow supply and return path, joints, relay and fuse-holder connections. If satisfactory voltage reaches the equipment during failure, turn to device, signal or mechanics. An unloaded reading cannot clear a loaded circuit. [REF P01, P03, A01]",
    "systems": [
      "shared"
    ],
    "sourceRefs": [
      "P01",
      "P03",
      "A01"
    ],
    "summary": "Ask for rated output and actual loaded voltage at the correct PSU +/− and equipment +/− during the same condition, plus each protected output indicator.",
    "revision": "2026-11-02.1",
    "reviewStatus": "generic-reviewed",
    "provenance": "Adapted from user-supplied FINDR research and implementation brief v1.0; question order is FINDR product design, not a manufacturer procedure.",
    "sourceBriefStatus": "Supplied research text. Model-specific examples require separate verification and are not enabled comparators.",
    "rules": [
      {
        "id": "P03.Q1",
        "revision": "2026-11-02.1",
        "routeId": "P03",
        "family": "P",
        "question": "Were the source and load observations made during the same operating state?",
        "why": "An unloaded source reading cannot clear a loaded circuit.",
        "testTemplate": "observation",
        "evidenceToCollect": [
          "Shared supply identity",
          "Source and load points",
          "Times",
          "Load state"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "P03.Q2",
        "noTarget": "P04",
        "unknownTarget": "P04",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "P01",
          "P03",
          "A01"
        ]
      },
      {
        "id": "P03.Q2",
        "revision": "2026-11-02.1",
        "routeId": "P03",
        "family": "P",
        "question": "Does the source output fall during the same symptom at the load?",
        "why": "A falling source points towards the common supply or demand; a stable source keeps the distribution path in scope.",
        "testTemplate": "voltage",
        "evidenceToCollect": [
          "Source +/−",
          "Load +/−",
          "Connected load",
          "Same-state readings",
          "Protected channel indication"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "energised",
          "instrument"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "P04",
        "noTarget": "P03.Q3",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T1",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "P01",
          "P03",
          "A01"
        ]
      },
      {
        "id": "P03.Q3",
        "revision": "2026-11-02.1",
        "routeId": "P03",
        "family": "P",
        "question": "Is the load's terminal reading consistent with its applicable documented reference during failure?",
        "why": "Correct drive at the actual failing equipment shifts attention to signal, device or mechanics without proving a component bad.",
        "testTemplate": "voltage",
        "evidenceToCollect": [
          "Exact equipment reference",
          "Probe polarity",
          "Loaded terminal value",
          "Physical behaviour"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "energised",
          "instrument"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "handover",
        "noTarget": "P06",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T1",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "P01",
          "P03",
          "A01"
        ]
      }
    ],
    "closeout": [
      "An unloaded reading cannot clear a loaded circuit.",
      "Keep the incident outcome separate from restoration; retain unresolved evidence and the named next action."
    ]
  },
  {
    "id": "P04",
    "title": "Voltage drop only under demand",
    "sourceBrief": "Ask whether the failure coincides with alarm sounders, unlocking, IR illumination, PTZ travel, radio transmission or AC loss. Capture paired readings at source and load before and during that event and actual load current if available via a suitable method. Record cable route/length if known, connectors, multiple loads and minimum captured values. For steady DC, source voltage minus load voltage is meaningful only for comparable points, polarity, shared supply and load state. If localised to the path, separate feed-side and return-side losses with suitable authorised measurements. If equipment demands exceed the documented supply capacity, refer for design review. [REF P01, P03, C01–C02]",
    "systems": [
      "shared"
    ],
    "sourceRefs": [
      "P01",
      "P03",
      "C01",
      "C02"
    ],
    "summary": "Ask whether the failure coincides with alarm sounders, unlocking, IR illumination, PTZ travel, radio transmission or AC loss.",
    "revision": "2026-11-02.1",
    "reviewStatus": "generic-reviewed",
    "provenance": "Adapted from user-supplied FINDR research and implementation brief v1.0; question order is FINDR product design, not a manufacturer procedure.",
    "sourceBriefStatus": "Supplied research text. Model-specific examples require separate verification and are not enabled comparators.",
    "rules": [
      {
        "id": "P04.Q1",
        "revision": "2026-11-02.1",
        "routeId": "P04",
        "family": "P",
        "question": "Does the failure coincide with a named increase in demand?",
        "why": "Alarm, release, IR or movement timing identifies the condition to compare without making it the cause.",
        "testTemplate": "observation",
        "evidenceToCollect": [
          "Demand event",
          "Failure time",
          "Other loads",
          "Healthy baseline"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "P04.Q2",
        "noTarget": "P08",
        "unknownTarget": "P08",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "P01",
          "P03",
          "C01",
          "C02"
        ]
      },
      {
        "id": "P04.Q2",
        "revision": "2026-11-02.1",
        "routeId": "P04",
        "family": "P",
        "question": "Were both voltage-drop endpoints observed under the same recorded load state?",
        "why": "Subtracting unmatched readings gives an invalid voltage-drop comparison.",
        "testTemplate": "voltage_drop",
        "evidenceToCollect": [
          "Source and load pairs",
          "Polarity",
          "Common source",
          "Operating state and timestamps"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "energised",
          "instrument"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "P04.Q3",
        "noTarget": "manual",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T1",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "P01",
          "P03",
          "C01",
          "C02"
        ]
      },
      {
        "id": "P04.Q3",
        "revision": "2026-11-02.1",
        "routeId": "P04",
        "family": "P",
        "question": "Does the path loss increase during that comparable demand?",
        "why": "A state-dependent path loss supports examining terminations and distribution; it does not locate a break by itself.",
        "testTemplate": "voltage_drop",
        "evidenceToCollect": [
          "Before/during values",
          "Feed and return identity",
          "Instrument",
          "Documented comparison"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "energised",
          "instrument"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "P06",
        "noTarget": "P03",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T1",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "P01",
          "P03",
          "C01",
          "C02"
        ]
      }
    ],
    "closeout": [
      "If equipment demands exceed the documented supply capacity, refer for design review.",
      "Keep the incident outcome separate from restoration; retain unresolved evidence and the named next action."
    ]
  },
  {
    "id": "P05",
    "title": "Battery, charger or standby fault",
    "sourceBrief": "Ask for exact fault indication, not just “new batteries needed”. Log PSU/model, battery chemistry/model, individual units, rated Ah, series/parallel arrangement, age/date code, ambient condition, physical condition, connectors/interlink/fuses, charger status, each unit and string voltage with state/time, and supported test method. Treat swelling, damage or overheating as a safety escalation. Mains healthy with battery fault → inspect connections and model fault codes. Voltage present at rest → capacity unverified. Approved load/capacity test fails under documented conditions → distinguish battery, charging, cabling or over-demand before replacement. Record restored charge/standby status and any remaining impairment. [REF P01–P02]",
    "systems": [
      "shared"
    ],
    "sourceRefs": [
      "P01",
      "P02"
    ],
    "summary": "Ask for exact fault indication, not just “new batteries needed”.",
    "revision": "2026-11-02.1",
    "reviewStatus": "generic-reviewed",
    "provenance": "Adapted from user-supplied FINDR research and implementation brief v1.0; question order is FINDR product design, not a manufacturer procedure.",
    "sourceBriefStatus": "Supplied research text. Model-specific examples require separate verification and are not enabled comparators.",
    "rules": [
      {
        "id": "P05.Q1",
        "revision": "2026-11-02.1",
        "routeId": "P05",
        "family": "P",
        "question": "Does the recorded fault specifically identify the battery or standby subsystem?",
        "why": "The exact indication separates battery evidence from charger, source and output faults.",
        "testTemplate": "display",
        "evidenceToCollect": [
          "Exact fault text",
          "PSU model",
          "Battery/string identities",
          "Physical condition"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "P05.Q2",
        "noTarget": "P01",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "P01",
          "P02"
        ]
      },
      {
        "id": "P05.Q2",
        "revision": "2026-11-02.1",
        "routeId": "P05",
        "family": "P",
        "question": "Is there a recorded result from the battery's applicable capacity or load-test method?",
        "why": "Resting terminal voltage alone cannot establish usable capacity.",
        "testTemplate": "battery",
        "evidenceToCollect": [
          "Chemistry and capacity",
          "Unit and string values",
          "Test method/state",
          "Temperature",
          "Test result"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "instrument",
          "impairment"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "P05.Q3",
        "noTarget": "manual",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T1",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "P01",
          "P02"
        ]
      },
      {
        "id": "P05.Q3",
        "revision": "2026-11-02.1",
        "routeId": "P05",
        "family": "P",
        "question": "Did the supported test show the required standby function during its documented condition?",
        "why": "A deficient result leaves battery, charging, connections and demand in scope until differentiated.",
        "testTemplate": "battery",
        "evidenceToCollect": [
          "Supported expected result",
          "Charge indication",
          "Connections/interlink",
          "Remaining service impairment"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "instrument",
          "impairment"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "handover",
        "noTarget": "P03",
        "unknownTarget": "handover",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T1",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "P01",
          "P02"
        ]
      }
    ],
    "closeout": [
      "Record restored charge/standby status and any remaining impairment.",
      "Keep the incident outcome separate from restoration; retain unresolved evidence and the named next action."
    ]
  },
  {
    "id": "P06",
    "title": "Suspected open on a known radial",
    "sourceBrief": "Ask feed end, actual cable order, branches, last verified working point and first failed point. At permissible test points log the differential supply/signal observation across the intended pair, same mode and load. Distinguish incoming from outgoing and positive from return conductor. On a valid simple radial, evidence on the incoming side of B and absence at the incoming side of adjacent C focuses inspection on B’s outgoing termination, the intervening run and C’s incoming termination. An open return, missing feed, local isolator or bad reference can look alike. On an isolated bare span, test each conductor end-to-end if available. Record far-end disposition and expected lead/cable resistance. If adjacency is unknown, report a search area and seek trace/drawing. [REF P03–P04, F01–F03]",
    "systems": [
      "shared"
    ],
    "sourceRefs": [
      "P03",
      "P04",
      "F01",
      "F02",
      "F03"
    ],
    "summary": "Ask feed end, actual cable order, branches, last verified working point and first failed point.",
    "revision": "2026-11-02.1",
    "reviewStatus": "generic-reviewed",
    "provenance": "Adapted from user-supplied FINDR research and implementation brief v1.0; question order is FINDR product design, not a manufacturer procedure.",
    "sourceBriefStatus": "Supplied research text. Model-specific examples require separate verification and are not enabled comparators.",
    "rules": [
      {
        "id": "P06.Q1",
        "revision": "2026-11-02.1",
        "routeId": "P06",
        "family": "P",
        "question": "Is the affected circuit confirmed to be a simple radial path?",
        "why": "A return loop, branch or unknown path cannot be narrowed by a simple radial assumption.",
        "testTemplate": "observation",
        "evidenceToCollect": [
          "Topology",
          "Field/drawing provenance",
          "Feed end",
          "Branches or unknown sections"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "P06.Q2",
        "noTarget": "manual",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "P03",
          "P04",
          "F01",
          "F02",
          "F03"
        ]
      },
      {
        "id": "P06.Q2",
        "revision": "2026-11-02.1",
        "routeId": "P06",
        "family": "P",
        "question": "Are the last satisfactory and first differing points confirmed physical neighbours?",
        "why": "Logical address order is not physical adjacency.",
        "testTemplate": "observation",
        "evidenceToCollect": [
          "Two point labels",
          "Incoming/outgoing sides",
          "Intervening joints",
          "Trace or drawing evidence"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "physicalPath"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "P06.Q3",
        "noTarget": "manual",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T1",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "P03",
          "P04",
          "F01",
          "F02",
          "F03"
        ]
      },
      {
        "id": "P06.Q3",
        "revision": "2026-11-02.1",
        "routeId": "P06",
        "family": "P",
        "question": "Were the boundary observations made using comparable pairs and the same state?",
        "why": "Only comparable boundary evidence supports nominating the run and both terminations for inspection.",
        "testTemplate": "observation",
        "evidenceToCollect": [
          "Reference pair and polarity",
          "Load state",
          "Time",
          "Evidence at both boundaries"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "P06.Q4",
        "noTarget": "P04",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "P03",
          "P04",
          "F01",
          "F02",
          "F03"
        ]
      },
      {
        "id": "P06.Q4",
        "revision": "2026-11-02.1",
        "routeId": "P06",
        "family": "P",
        "question": "Is there a permitted isolated end-to-end result for the individual conductor in this span?",
        "why": "A conductor test can strengthen localisation; a reading across unrelated cores cannot.",
        "testTemplate": "continuity",
        "evidenceToCollect": [
          "Isolated span",
          "Each conductor separately",
          "Far-end disposition",
          "Lead compensation",
          "Both terminations"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "isolation",
          "bothEnds",
          "bareSpan",
          "instrument"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "handover",
        "noTarget": "handover",
        "unknownTarget": "handover",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T1",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "P03",
          "P04",
          "F01",
          "F02",
          "F03"
        ]
      }
    ],
    "closeout": [
      "If adjacency is unknown, report a search area and seek trace/drawing.",
      "Keep the incident outcome separate from restoration; retain unresolved evidence and the named next action."
    ]
  },
  {
    "id": "P07",
    "title": "Short, earth fault or unstable leakage",
    "sourceBrief": "Ask which device reports the fault and whether conductor-to-conductor, conductor-to-screen/earth or a supervision condition is actually indicated. Record polarity where the device supports it, wet areas/works, circuit/time and alternate feeds. Use panel diagnostics and drawings first. If authorised, separate only documented sections with effects controlled and track which removal changes the indication. A fault following a section supports localisation. Shared paths, multiple faults and rerouted feeds can mask it. On a fully isolated, identified bare span, separate conductor-to-conductor and conductor-to-screen tests under the applicable method. Never remove protective earth to clear a fault. [REF S01–S03, P03, F01–F02]",
    "systems": [
      "shared"
    ],
    "sourceRefs": [
      "S01",
      "S02",
      "S03",
      "P03",
      "F01",
      "F02"
    ],
    "summary": "Ask which device reports the fault and whether conductor-to-conductor, conductor-to-screen/earth or a supervision condition is actually indicated.",
    "revision": "2026-11-02.1",
    "reviewStatus": "generic-reviewed",
    "provenance": "Adapted from user-supplied FINDR research and implementation brief v1.0; question order is FINDR product design, not a manufacturer procedure.",
    "sourceBriefStatus": "Supplied research text. Model-specific examples require separate verification and are not enabled comparators.",
    "rules": [
      {
        "id": "P07.Q1",
        "revision": "2026-11-02.1",
        "routeId": "P07",
        "family": "P",
        "question": "Does the reporting equipment distinguish earth leakage from a conductor-to-conductor condition?",
        "why": "The indication's actual meaning determines the next evidence; the word short alone is insufficient.",
        "testTemplate": "display",
        "evidenceToCollect": [
          "Exact indication",
          "Reporting asset",
          "Supported polarity",
          "Time and weather/work context"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "P07.Q2",
        "noTarget": "manual",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "S01",
          "S02",
          "S03",
          "P03",
          "F01",
          "F02"
        ]
      },
      {
        "id": "P07.Q2",
        "revision": "2026-11-02.1",
        "routeId": "P07",
        "family": "P",
        "question": "Did a documented section comparison make the indication follow one identified section?",
        "why": "A controlled comparison can bound a section but shared paths and multiple faults can mask it.",
        "testTemplate": "observation",
        "evidenceToCollect": [
          "Sections and alternate feeds",
          "Before/after indication",
          "Temporary changes",
          "Coverage impact"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "impairment",
          "change",
          "physicalPath",
          "exactProfile"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "P07.Q3",
        "noTarget": "P08",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T1",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "S01",
          "S02",
          "S03",
          "P03",
          "F01",
          "F02"
        ]
      },
      {
        "id": "P07.Q3",
        "revision": "2026-11-02.1",
        "routeId": "P07",
        "family": "P",
        "question": "Are all sources and connected electronics excluded from the proposed cable test span?",
        "why": "Unknown electronics or backfeeds prevent treating the measurement as a bare-span test.",
        "testTemplate": "resistance",
        "evidenceToCollect": [
          "Conductor-to-conductor versus screen test",
          "Span endpoints",
          "Applicable method",
          "No default insulation voltage"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "isolation",
          "bothEnds",
          "bareSpan",
          "instrument"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "handover",
        "noTarget": "manual",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T1",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "S01",
          "S02",
          "S03",
          "P03",
          "F01",
          "F02"
        ]
      }
    ],
    "closeout": [
      "Never remove protective earth to clear a fault.",
      "Keep the incident outcome separate from restoration; retain unresolved evidence and the named next action."
    ]
  },
  {
    "id": "P08",
    "title": "Intermittent / first engineer could not reproduce",
    "sourceBrief": "Ask for first fault and restore timestamps, frequency/duration, clock drift and symptom shared across devices. Correlate doors moving, stock handling, HVAC cycles, rain, IR change, power transfer, building work and user operation. Record baseline when healthy plus evidence needed during recurrence. An approved temporary logger has owner, duration, sampling/trigger needs, attachment point, review date and safe removal plan. An absence of repeat during the visit stays “not reproduced”. If the only differentiating point is inaccessible, go to handover. Do not encourage substituting unrelated parts. [REF F05, C01, C05, I01]",
    "systems": [
      "shared"
    ],
    "sourceRefs": [
      "F05",
      "C01",
      "C05",
      "I01"
    ],
    "summary": "Ask for first fault and restore timestamps, frequency/duration, clock drift and symptom shared across devices.",
    "revision": "2026-11-02.1",
    "reviewStatus": "generic-reviewed",
    "provenance": "Adapted from user-supplied FINDR research and implementation brief v1.0; question order is FINDR product design, not a manufacturer procedure.",
    "sourceBriefStatus": "Supplied research text. Model-specific examples require separate verification and are not enabled comparators.",
    "rules": [
      {
        "id": "P08.Q1",
        "revision": "2026-11-02.1",
        "routeId": "P08",
        "family": "P",
        "question": "Is there a clocked history of the fault occurring before this visit?",
        "why": "A cleared indication still leaves a useful incident timeline.",
        "testTemplate": "display",
        "evidenceToCollect": [
          "First/restore times",
          "Clock offset",
          "Reporter",
          "Present state"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "P08.Q2",
        "noTarget": "P08.Q3",
        "unknownTarget": "P08.Q3",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "F05",
          "C01",
          "C05",
          "I01"
        ]
      },
      {
        "id": "P08.Q2",
        "revision": "2026-11-02.1",
        "routeId": "P08",
        "family": "P",
        "question": "Does the history correlate with a repeated operating or environmental condition?",
        "why": "A correlation selects useful evidence to collect during recurrence, not a confirmed cause.",
        "testTemplate": "observation",
        "evidenceToCollect": [
          "Frequency and duration",
          "Other affected assets",
          "HVAC/rain/IR/movement",
          "Known-good baseline"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "P08.Q3",
        "noTarget": "P08.Q3",
        "unknownTarget": "handover",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "F05",
          "C01",
          "C05",
          "I01"
        ]
      },
      {
        "id": "P08.Q3",
        "revision": "2026-11-02.1",
        "routeId": "P08",
        "family": "P",
        "question": "Can the discriminating evidence be obtained during this visit without an unapproved interruption?",
        "why": "Inaccessible or absent symptoms should lead to a useful return plan instead of repeated blocked checks.",
        "testTemplate": "observation",
        "evidenceToCollect": [
          "Access limit",
          "Evidence needed at recurrence",
          "Logger/tool owner if approved",
          "Review date"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "P09",
        "noTarget": "handover",
        "unknownTarget": "handover",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "F05",
          "C01",
          "C05",
          "I01"
        ]
      }
    ],
    "closeout": [
      "Do not encourage substituting unrelated parts.",
      "Keep the incident outcome separate from restoration; retain unresolved evidence and the named next action."
    ]
  },
  {
    "id": "P09",
    "title": "Substitute, divide a circuit, or compare a known-good path",
    "sourceBrief": "Ask whether there is a compatible, independently verified comparator and whether the comparison would affect other protection. Record original configuration and point, candidate changed, one variable changed at a time, same state/load, before/after and restoration. If failure follows the device under equivalent conditions, confidence in that asset increases. If it remains on a route/port/channel, investigate that path. If multiple variables move at once, mark “inconclusive” and state why. Every temporary change gets a restoration item. For life-safety circuits a panel-supported diagnostic usually comes first. [REF F01–F03, A03, C02, C06]",
    "systems": [
      "shared"
    ],
    "sourceRefs": [
      "F01",
      "F02",
      "F03",
      "A03",
      "C02",
      "C06"
    ],
    "summary": "Ask whether there is a compatible, independently verified comparator and whether the comparison would affect other protection.",
    "revision": "2026-11-02.1",
    "reviewStatus": "generic-reviewed",
    "provenance": "Adapted from user-supplied FINDR research and implementation brief v1.0; question order is FINDR product design, not a manufacturer procedure.",
    "sourceBriefStatus": "Supplied research text. Model-specific examples require separate verification and are not enabled comparators.",
    "rules": [
      {
        "id": "P09.Q1",
        "revision": "2026-11-02.1",
        "routeId": "P09",
        "family": "P",
        "question": "Is the proposed comparator independently known to work in an equivalent condition?",
        "why": "A similar-looking or differently loaded item is not a valid known-good comparator.",
        "testTemplate": "observation",
        "evidenceToCollect": [
          "Comparator identity",
          "Compatibility",
          "Condition and load",
          "Evidence it works"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "P09.Q2",
        "noTarget": "manual",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "F01",
          "F02",
          "F03",
          "A03",
          "C02",
          "C06"
        ]
      },
      {
        "id": "P09.Q2",
        "revision": "2026-11-02.1",
        "routeId": "P09",
        "family": "P",
        "question": "Would the comparison change only one recorded variable?",
        "why": "Moving multiple variables together cannot discriminate which change affected the symptom.",
        "testTemplate": "observation",
        "evidenceToCollect": [
          "Original setup",
          "Single changed variable",
          "Affected functions",
          "Restoration item"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "P09.Q3",
        "noTarget": "handover",
        "unknownTarget": "handover",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "F01",
          "F02",
          "F03",
          "A03",
          "C02",
          "C06"
        ]
      },
      {
        "id": "P09.Q3",
        "revision": "2026-11-02.1",
        "routeId": "P09",
        "family": "P",
        "question": "Did the fault follow that one changed asset under equivalent conditions?",
        "why": "This result supports the asset hypothesis; a fault staying on the path supports investigating the route instead.",
        "testTemplate": "functional",
        "evidenceToCollect": [
          "Before and after symptom",
          "Same-state evidence",
          "Temporary change",
          "Retest and restoration"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "impairment",
          "change"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "handover",
        "noTarget": "P06",
        "unknownTarget": "handover",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T1",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "F01",
          "F02",
          "F03",
          "A03",
          "C02",
          "C06"
        ]
      }
    ],
    "closeout": [
      "For life-safety circuits a panel-supported diagnostic usually comes first.",
      "Keep the incident outcome separate from restoration; retain unresolved evidence and the named next action."
    ]
  },
  {
    "id": "F01",
    "title": "Conventional detection zone open",
    "sourceBrief": "Ask panel variant, exact zone fault, whether it identifies open versus short, compatible bases/head-removal monitoring, end-of-line (EOL) component and its true position. Log last working/first failed physical device, in/out terminals, prescribed standby indication, head present/seated, EOL type/location and recent head swaps. A capacitor/active EOL cannot be judged against a resistor value. If a head is missing, verify the base arrangement and what downstream function is affected. If healthy up to one boundary use P06. Where the correct panel-local EOL test is permitted and clears the indication, the field circuit is implicated but protection is interrupted. Remove temporary components, reinstate the true EOL and functionally prove the repaired zone. [REF F01, F11, P03]",
    "systems": [
      "fire"
    ],
    "sourceRefs": [
      "F01",
      "F11",
      "P03"
    ],
    "summary": "Ask panel variant, exact zone fault, whether it identifies open versus short, compatible bases/head-removal monitoring, end-of-line (EOL) component and its true position.",
    "revision": "2026-11-02.1",
    "reviewStatus": "generic-reviewed",
    "provenance": "Adapted from user-supplied FINDR research and implementation brief v1.0; question order is FINDR product design, not a manufacturer procedure.",
    "sourceBriefStatus": "Supplied research text. Model-specific examples require separate verification and are not enabled comparators.",
    "rules": [
      {
        "id": "F01.Q1",
        "revision": "2026-11-02.1",
        "routeId": "F01",
        "family": "F",
        "question": "Is the exact detector-zone end component identified for this panel variant?",
        "why": "A capacitor or active EOL must not be judged as a sounder-circuit resistor.",
        "testTemplate": "observation",
        "evidenceToCollect": [
          "Panel variant",
          "Detector-zone circuit type",
          "EOL component and true location",
          "Manual locator"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "F01.Q2",
        "noTarget": "manual",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "F01",
          "F11",
          "P03"
        ]
      },
      {
        "id": "F01.Q2",
        "revision": "2026-11-02.1",
        "routeId": "F01",
        "family": "F",
        "question": "Is a detector head confirmed missing from a base on this zone?",
        "why": "Head-removal monitoring and downstream effects depend on the actual base arrangement.",
        "testTemplate": "observation",
        "evidenceToCollect": [
          "Head/base identity",
          "Physical location",
          "Recent head changes",
          "Affected function"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "F01.Q3",
        "noTarget": "P06",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "F01",
          "F11",
          "P03"
        ]
      },
      {
        "id": "F01.Q3",
        "revision": "2026-11-02.1",
        "routeId": "F01",
        "family": "F",
        "question": "Does the applicable base arrangement account for the recorded downstream loss?",
        "why": "A missing head is a finding, but its effect must agree with the installed monitoring arrangement.",
        "testTemplate": "observation",
        "evidenceToCollect": [
          "Matched base drawing",
          "Functional boundary",
          "Unexamined section",
          "Required reinstatement checks"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "handover",
        "noTarget": "P06",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "F01",
          "F11",
          "P03"
        ]
      }
    ],
    "closeout": [
      "Remove temporary components, reinstate the true EOL and functionally prove the repaired zone.",
      "Keep the incident outcome separate from restoration; retain unresolved evidence and the named next action."
    ]
  },
  {
    "id": "F02",
    "title": "Conventional zone short or unexpected alarm indication",
    "sourceBrief": "Ask which state the actual panel assigned to low impedance and what devices/interfaces are connected. Log detector/MCP indication, latched state, works/water, whether the symptom is reported as a fire event or fault, and relevant configuration. Treat an active fire alarm as an emergency until handled under the site procedure. If a documented supervised section changes the indication, narrow that section. If the panel does not behave as its matched manual predicts with the prescribed field test setup, escalate panel/input investigation. Do not model a universal “short equals fire” or “short equals fault”. [REF F01, F11, S04–S05]",
    "systems": [
      "fire"
    ],
    "sourceRefs": [
      "F01",
      "F11",
      "S04",
      "S05"
    ],
    "summary": "Ask which state the actual panel assigned to low impedance and what devices/interfaces are connected.",
    "revision": "2026-11-02.1",
    "reviewStatus": "generic-reviewed",
    "provenance": "Adapted from user-supplied FINDR research and implementation brief v1.0; question order is FINDR product design, not a manufacturer procedure.",
    "sourceBriefStatus": "Supplied research text. Model-specific examples require separate verification and are not enabled comparators.",
    "rules": [
      {
        "id": "F02.Q1",
        "revision": "2026-11-02.1",
        "routeId": "F02",
        "family": "F",
        "question": "Is the unexpected indication being treated as an unconfirmed fire event by the site?",
        "why": "A possible fire takes priority over routine zone diagnostics.",
        "testTemplate": "display",
        "evidenceToCollect": [
          "Exact fire/fault wording",
          "Time",
          "Site emergency response",
          "Notification owner"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "handover",
        "noTarget": "F02.Q2",
        "unknownTarget": "handover",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "F01",
          "F11",
          "S04",
          "S05"
        ]
      },
      {
        "id": "F02.Q2",
        "revision": "2026-11-02.1",
        "routeId": "F02",
        "family": "F",
        "question": "Does the exact panel variant document the meaning of this zone state?",
        "why": "Low impedance does not universally mean either fire or fault.",
        "testTemplate": "observation",
        "evidenceToCollect": [
          "Variant and manual",
          "Connected detector/interface types",
          "Configured circuit state"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "F02.Q3",
        "noTarget": "manual",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "F01",
          "F11",
          "S04",
          "S05"
        ]
      },
      {
        "id": "F02.Q3",
        "revision": "2026-11-02.1",
        "routeId": "F02",
        "family": "F",
        "question": "Did an authorised section comparison make the indication follow one physical section?",
        "why": "A controlled change can bound the affected path without identifying an individual component.",
        "testTemplate": "observation",
        "evidenceToCollect": [
          "Section identity",
          "Before/after",
          "Remaining coverage",
          "Restoration items"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "impairment",
          "change",
          "physicalPath",
          "exactProfile"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "P07",
        "noTarget": "handover",
        "unknownTarget": "handover",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T1",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "F01",
          "F11",
          "S04",
          "S05"
        ]
      }
    ],
    "closeout": [
      "Do not model a universal “short equals fire” or “short equals fault”.",
      "Keep the incident outcome separate from restoration; retain unresolved evidence and the named next action."
    ]
  },
  {
    "id": "F03",
    "title": "Addressable loop open, devices may still respond",
    "sourceBrief": "Ask if there is a return loop, spurs, isolators, more than one break, a card fault, or an undocumented alteration. Capture topology provenance, loop/driver/protocol, out/in diagnostics, devices seen from each supported direction, number expected/seen, and overlap or boundary witnesses. A loop break can be visible while every device is still polled. If diagnostics indicate a boundary, name the two physical points and unexamined joints. Use P06/P07 under a controlled method. With only logical addresses, offer the panel loop map/manual, not a physical break location. If an entire leg or several sections are missing, test topology and isolator explanations before assuming a single open. [REF F02–F04, F10]",
    "systems": [
      "fire"
    ],
    "sourceRefs": [
      "F02",
      "F03",
      "F04",
      "F10"
    ],
    "summary": "Ask if there is a return loop, spurs, isolators, more than one break, a card fault, or an undocumented alteration.",
    "revision": "2026-11-02.1",
    "reviewStatus": "generic-reviewed",
    "provenance": "Adapted from user-supplied FINDR research and implementation brief v1.0; question order is FINDR product design, not a manufacturer procedure.",
    "sourceBriefStatus": "Supplied research text. Model-specific examples require separate verification and are not enabled comparators.",
    "rules": [
      {
        "id": "F03.Q1",
        "revision": "2026-11-02.1",
        "routeId": "F03",
        "family": "F",
        "question": "Is there a verified return path on this circuit?",
        "why": "A return loop can keep all devices powered and polled while its integrity remains impaired.",
        "testTemplate": "observation",
        "evidenceToCollect": [
          "Physical topology provenance",
          "Return/spurs",
          "Loop card",
          "Protocol"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "F03.Q2",
        "noTarget": "P06",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "F02",
          "F03",
          "F04",
          "F10"
        ]
      },
      {
        "id": "F03.Q2",
        "revision": "2026-11-02.1",
        "routeId": "F03",
        "family": "F",
        "question": "Does the supported diagnostic show different reachability from the two feed directions?",
        "why": "Directional evidence can identify useful boundaries; a total device count cannot locate a physical break.",
        "testTemplate": "display",
        "evidenceToCollect": [
          "Exact diagnostic source",
          "Out/in results",
          "Expected and seen inventory",
          "Loop/driver identity"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "F03.Q3",
        "noTarget": "F04",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "F02",
          "F03",
          "F04",
          "F10"
        ]
      },
      {
        "id": "F03.Q3",
        "revision": "2026-11-02.1",
        "routeId": "F03",
        "family": "F",
        "question": "Can the diagnostic witnesses be placed on a verified physical map?",
        "why": "A logical boundary becomes a search span only after physical correspondence is established.",
        "testTemplate": "observation",
        "evidenceToCollect": [
          "Witness devices",
          "Field-checked labels",
          "Intervening joints",
          "Unknown alterations"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "physicalPath"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "P06",
        "noTarget": "manual",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T1",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "F02",
          "F03",
          "F04",
          "F10"
        ]
      }
    ],
    "closeout": [
      "If an entire leg or several sections are missing, test topology and isolator explanations before assuming a single open.",
      "Keep the incident outcome separate from restoration; retain unresolved evidence and the named next action."
    ]
  },
  {
    "id": "F04",
    "title": "Short-circuit isolator active / group missing",
    "sourceBrief": "Ask which isolators indicate operation, which side is fed, what responds either side and where local/spur power originates. Record isolator type/status and physical positions, missing points, devices at either boundary and time of first event. Compare the lost segment with the as-fitted map. An isolator can bound a short. An isolated segment can contain a damaged cable, wet base or device. An address range or isolator LED alone does not identify a bad detector. Escalate if multiple segments, unsupported protocols or hazardous-area devices make isolation ambiguous. Restore and verify all formerly lost devices and both loop paths. [REF F02–F04, F10, S07]",
    "systems": [
      "fire"
    ],
    "sourceRefs": [
      "F02",
      "F03",
      "F04",
      "F10",
      "S07"
    ],
    "summary": "Ask which isolators indicate operation, which side is fed, what responds either side and where local/spur power originates.",
    "revision": "2026-11-02.1",
    "reviewStatus": "generic-reviewed",
    "provenance": "Adapted from user-supplied FINDR research and implementation brief v1.0; question order is FINDR product design, not a manufacturer procedure.",
    "sourceBriefStatus": "Supplied research text. Model-specific examples require separate verification and are not enabled comparators.",
    "rules": [
      {
        "id": "F04.Q1",
        "revision": "2026-11-02.1",
        "routeId": "F04",
        "family": "F",
        "question": "Is a particular isolator's operation indicated by the installed system?",
        "why": "An isolator indication identifies a condition at a boundary, not a failed detector.",
        "testTemplate": "display",
        "evidenceToCollect": [
          "Isolator type",
          "Exact indication",
          "Time",
          "Local/spur feed"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "F04.Q2",
        "noTarget": "F03",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "F02",
          "F03",
          "F04",
          "F10",
          "S07"
        ]
      },
      {
        "id": "F04.Q2",
        "revision": "2026-11-02.1",
        "routeId": "F04",
        "family": "F",
        "question": "Do the missing devices correspond to one confirmed physical segment?",
        "why": "Several segments or alternate feeds weaken a single-section explanation.",
        "testTemplate": "observation",
        "evidenceToCollect": [
          "Fed sides",
          "Responding boundary devices",
          "Missing points",
          "As-fitted segment"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "physicalPath"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "F04.Q3",
        "noTarget": "P07",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T1",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "F02",
          "F03",
          "F04",
          "F10",
          "S07"
        ]
      },
      {
        "id": "F04.Q3",
        "revision": "2026-11-02.1",
        "routeId": "F04",
        "family": "F",
        "question": "Is the affected segment suitable for the matched diagnostic method?",
        "why": "Hazardous-area devices or unsupported protocols require specialist limits before any section testing.",
        "testTemplate": "observation",
        "evidenceToCollect": [
          "Protocol compatibility",
          "Barrier/IS presence",
          "Accessible boundaries",
          "Coverage impact"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "P07",
        "noTarget": "F15",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "F02",
          "F03",
          "F04",
          "F10",
          "S07"
        ]
      }
    ],
    "closeout": [
      "Restore and verify all formerly lost devices and both loop paths.",
      "Keep the incident outcome separate from restoration; retain unresolved evidence and the named next action."
    ]
  },
  {
    "id": "F05",
    "title": "One missing, wrong type or duplicate address",
    "sourceBrief": "Ask programmed identity versus actual label, protocol, address/subaddress method, base/head identity, compatibility, last change, and which neighbours respond. Compare live inventory with the dated download. Repeated conflicts at one address warrant checking both physical identities. One missing point with adjacent devices healthy warrants inspecting the local base, head, settings and feed as applicable. Preserve device serial/location where available. Do not auto-learn or delete a missing device to silence the mismatch. Retest the correct physical point, text/zone and intended actions under authorised conditions. [REF F02–F04]",
    "systems": [
      "fire"
    ],
    "sourceRefs": [
      "F02",
      "F03",
      "F04"
    ],
    "summary": "Ask programmed identity versus actual label, protocol, address/subaddress method, base/head identity, compatibility, last change, and which neighbours respond.",
    "revision": "2026-11-02.1",
    "reviewStatus": "generic-reviewed",
    "provenance": "Adapted from user-supplied FINDR research and implementation brief v1.0; question order is FINDR product design, not a manufacturer procedure.",
    "sourceBriefStatus": "Supplied research text. Model-specific examples require separate verification and are not enabled comparators.",
    "rules": [
      {
        "id": "F05.Q1",
        "revision": "2026-11-02.1",
        "routeId": "F05",
        "family": "F",
        "question": "Does the physical device label agree with the dated programmed identity?",
        "why": "Configuration exports describe expected programming, not the installed device today.",
        "testTemplate": "observation",
        "evidenceToCollect": [
          "Full part code",
          "Protocol",
          "Base/head",
          "Export date",
          "Observed label conflict"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "F05.Q2",
        "noTarget": "manual",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "F02",
          "F03",
          "F04"
        ]
      },
      {
        "id": "F05.Q2",
        "revision": "2026-11-02.1",
        "routeId": "F05",
        "family": "F",
        "question": "Is more than one physical device using the disputed address?",
        "why": "Repeated address conflicts require checking identities rather than deleting or relearning points.",
        "testTemplate": "observation",
        "evidenceToCollect": [
          "Node/loop/address/subaddress",
          "Physical labels",
          "Address method",
          "Last replacement"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "handover",
        "noTarget": "F05.Q3",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "F02",
          "F03",
          "F04"
        ]
      },
      {
        "id": "F05.Q3",
        "revision": "2026-11-02.1",
        "routeId": "F05",
        "family": "F",
        "question": "Are the physical neighbours communicating during this same fault?",
        "why": "A single-point pattern differs from a shared feed or segment failure.",
        "testTemplate": "display",
        "evidenceToCollect": [
          "Field-confirmed neighbours",
          "Current communication status",
          "Local base/feed observations",
          "Required physical-point retest"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "handover",
        "noTarget": "F04",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "F02",
          "F03",
          "F04"
        ]
      }
    ],
    "closeout": [
      "Retest the correct physical point, text/zone and intended actions under authorised conditions.",
      "Keep the incident outcome separate from restoration; retain unresolved evidence and the named next action."
    ]
  },
  {
    "id": "F06",
    "title": "Sounder/VAD circuit fault or fails only on alarm",
    "sourceBrief": "Ask loop-powered device vs conventional supervised notification circuit vs separate local PSU. Log circuit/zone, EOL and polarity method, standby/alarm readings at source and affected device, output command, silence/disablements, affected count, current/loading if available and visible/audible response. Supervision voltage may be reversed, pulsed or otherwise different in standby. A normal supervision indication cannot prove warning under load. One output sags on activation → P03/P04. Correct alarm drive at one failed device → inspect compatibility/setup/device and adjacent joints. Test agreed affected areas and restore sounder/VAD functions. For IS circuits use F15. [REF F01–F03, F10–F11, P01]",
    "systems": [
      "fire"
    ],
    "sourceRefs": [
      "F01",
      "F02",
      "F03",
      "F10",
      "F11",
      "P01"
    ],
    "summary": "Ask loop-powered device vs conventional supervised notification circuit vs separate local PSU.",
    "revision": "2026-11-02.1",
    "reviewStatus": "generic-reviewed",
    "provenance": "Adapted from user-supplied FINDR research and implementation brief v1.0; question order is FINDR product design, not a manufacturer procedure.",
    "sourceBriefStatus": "Supplied research text. Model-specific examples require separate verification and are not enabled comparators.",
    "rules": [
      {
        "id": "F06.Q1",
        "revision": "2026-11-02.1",
        "routeId": "F06",
        "family": "F",
        "question": "Is this a conventional supervised notification circuit?",
        "why": "Conventional outputs, loop-powered devices and local PSUs need different observations.",
        "testTemplate": "observation",
        "evidenceToCollect": [
          "Circuit technology",
          "Output identity",
          "EOL and polarity method",
          "Supply domain"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "F06.Q2",
        "noTarget": "F06.Q3",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "F01",
          "F02",
          "F03",
          "F10",
          "F11",
          "P01"
        ]
      },
      {
        "id": "F06.Q2",
        "revision": "2026-11-02.1",
        "routeId": "F06",
        "family": "F",
        "question": "Does the source output fall during the authorised alarm demand?",
        "why": "A normal standby supervision state does not prove warning performance under load.",
        "testTemplate": "voltage",
        "evidenceToCollect": [
          "Standby versus alarm state",
          "Source/load readings",
          "Output command",
          "Affected count"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "energised",
          "instrument",
          "impairment"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "P04",
        "noTarget": "F06.Q3",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T1",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "F01",
          "F02",
          "F03",
          "F10",
          "F11",
          "P01"
        ]
      },
      {
        "id": "F06.Q3",
        "revision": "2026-11-02.1",
        "routeId": "F06",
        "family": "F",
        "question": "Was the expected warning response physically observed in each affected area?",
        "why": "An output indication alone cannot establish sounder or VAD operation.",
        "testTemplate": "functional",
        "evidenceToCollect": [
          "Audible/visible response",
          "Area",
          "Witness",
          "Disablements",
          "Final warning state"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "impairment"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "handover",
        "noTarget": "P03",
        "unknownTarget": "handover",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T1",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "F01",
          "F02",
          "F03",
          "F10",
          "F11",
          "P01"
        ]
      }
    ],
    "closeout": [
      "For IS circuits use F15.",
      "Keep the incident outcome separate from restoration; retain unresolved evidence and the named next action."
    ]
  },
  {
    "id": "F07",
    "title": "Earth-fault indication, possibly intermittent",
    "sourceBrief": "Ask panel/PSU location, exact earth indication, onset near rain/building work, earthed screens or ancillary paths. Preserve history before resets. Where supported, capture polarity/direction and card meter results. Apollo’s automated negative-conductor earth-location function has specific Soteria/isolator and circuit-condition requirements. Do not offer it as a universal XP95 tool. If authorised separation identifies one field circuit, follow that boundary. Otherwise consider panel, PSU, network or ancillary paths. Record all temporary impairments and verify clearance on complete reconnection. [REF F01–F04, P03]",
    "systems": [
      "fire"
    ],
    "sourceRefs": [
      "F01",
      "F02",
      "F03",
      "F04",
      "P03"
    ],
    "summary": "Ask panel/PSU location, exact earth indication, onset near rain/building work, earthed screens or ancillary paths.",
    "revision": "2026-11-02.1",
    "reviewStatus": "generic-reviewed",
    "provenance": "Adapted from user-supplied FINDR research and implementation brief v1.0; question order is FINDR product design, not a manufacturer procedure.",
    "sourceBriefStatus": "Supplied research text. Model-specific examples require separate verification and are not enabled comparators.",
    "rules": [
      {
        "id": "F07.Q1",
        "revision": "2026-11-02.1",
        "routeId": "F07",
        "family": "F",
        "question": "Is the earth-fault indication still present now?",
        "why": "A cleared indication changes the evidence available but does not prove repair.",
        "testTemplate": "display",
        "evidenceToCollect": [
          "Exact event and restore times",
          "Panel/PSU",
          "Present state",
          "Recent weather/work"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "F07.Q2",
        "noTarget": "P08",
        "unknownTarget": "P08",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "F01",
          "F02",
          "F03",
          "F04",
          "P03"
        ]
      },
      {
        "id": "F07.Q2",
        "revision": "2026-11-02.1",
        "routeId": "F07",
        "family": "F",
        "question": "Does the matched diagnostic identify an affected circuit or direction?",
        "why": "Only supported diagnostics can narrow the earth indication; automated search features are protocol-specific.",
        "testTemplate": "display",
        "evidenceToCollect": [
          "Diagnostic name/version",
          "Circuit/polarity",
          "Loop card",
          "Ancillary earth paths"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "F07.Q3",
        "noTarget": "P07",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "F01",
          "F02",
          "F03",
          "F04",
          "P03"
        ]
      },
      {
        "id": "F07.Q3",
        "revision": "2026-11-02.1",
        "routeId": "F07",
        "family": "F",
        "question": "Was clearance verified with the complete normal circuit reconnected?",
        "why": "Clearance while a section remains removed does not prove restored protection.",
        "testTemplate": "functional",
        "evidenceToCollect": [
          "Temporary separations",
          "Complete reconnection",
          "Original indication",
          "Restoration checks"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "impairment"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "handover",
        "noTarget": "P07",
        "unknownTarget": "handover",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T1",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "F01",
          "F02",
          "F03",
          "F04",
          "P03"
        ]
      }
    ],
    "closeout": [
      "Record all temporary impairments and verify clearance on complete reconnection.",
      "Keep the incident outcome separate from restoration; retain unresolved evidence and the named next action."
    ]
  },
  {
    "id": "F08",
    "title": "Contamination / pre-alarm / repeated unwanted alarm",
    "sourceBrief": "Ask exact event type and whether actual fire was excluded under the site response. Log detector model/type, analogue/contamination trend where supported, environment and time (steam, dust, insects, fumes or work), comparison with equivalent detector and room use. If event matches a recurring exposure, recommend site/environment investigation. If a single head’s supported trend departs from peers, inspect/service using its manual. A high reading alone cannot select a replacement or sensitivity setting. Verify approved detector response and record recurrence review. [REF F02–F03, F09, S04–S05]",
    "systems": [
      "fire"
    ],
    "sourceRefs": [
      "F02",
      "F03",
      "F09",
      "S04",
      "S05"
    ],
    "summary": "Ask exact event type and whether actual fire was excluded under the site response.",
    "revision": "2026-11-02.1",
    "reviewStatus": "generic-reviewed",
    "provenance": "Adapted from user-supplied FINDR research and implementation brief v1.0; question order is FINDR product design, not a manufacturer procedure.",
    "sourceBriefStatus": "Supplied research text. Model-specific examples require separate verification and are not enabled comparators.",
    "rules": [
      {
        "id": "F08.Q1",
        "revision": "2026-11-02.1",
        "routeId": "F08",
        "family": "F",
        "question": "Has the site response excluded an active or unconfirmed fire for this event?",
        "why": "An unwanted-alarm investigation cannot downgrade an unresolved fire event.",
        "testTemplate": "observation",
        "evidenceToCollect": [
          "Event category",
          "Site response",
          "Witness",
          "Time"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "F08.Q2",
        "noTarget": "handover",
        "unknownTarget": "handover",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "F02",
          "F03",
          "F09",
          "S04",
          "S05"
        ]
      },
      {
        "id": "F08.Q2",
        "revision": "2026-11-02.1",
        "routeId": "F08",
        "family": "F",
        "question": "Does the event coincide with a recorded recurring exposure at this detector?",
        "why": "Environmental correlation can guide investigation without proving contamination or selecting a replacement.",
        "testTemplate": "observation",
        "evidenceToCollect": [
          "Steam/dust/fumes/works",
          "Room use",
          "Detector location",
          "Event timing"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "P08",
        "noTarget": "F08.Q3",
        "unknownTarget": "P08",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "F02",
          "F03",
          "F09",
          "S04",
          "S05"
        ]
      },
      {
        "id": "F08.Q3",
        "revision": "2026-11-02.1",
        "routeId": "F08",
        "family": "F",
        "question": "Does the supported detector trend differ from a comparable peer under equivalent conditions?",
        "why": "A documented trend comparison is stronger evidence than a single generic high value.",
        "testTemplate": "display",
        "evidenceToCollect": [
          "Exact detector model",
          "Trend units/source",
          "Comparable peer",
          "Maintenance evidence",
          "Recurrence review"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "handover",
        "noTarget": "P08",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "F02",
          "F03",
          "F09",
          "S04",
          "S05"
        ]
      }
    ],
    "closeout": [
      "Verify approved detector response and record recurrence review.",
      "Keep the incident outcome separate from restoration; retain unresolved evidence and the named next action."
    ]
  },
  {
    "id": "F09",
    "title": "Aspirating detector intermittent low/high airflow",
    "sourceBrief": "Ask which local ASD fault, which active pipe(s), exact code and restore time. A host panel’s common fault hides detail. Log per-pipe current flow with units and baseline, commissioned values, filter/aspirator status, active pipe config, HVAC/building pressure, obstructions, sampling holes, end caps, joints, works and access to the far end. A low reading directs inspection towards restrictions, filter, aspirator and pressure effects. High flow can be consistent with an open joint or changed pipe. Neither uniquely identifies a hole or a break. One pipe vs all pipes changes the next inspection. Preserve the event log if currently normal. Do not normalise away the evidence. After authorised repair, compare with design and verify sampling/transport performance using the prescribed method. [REF F05–F06]",
    "systems": [
      "fire"
    ],
    "sourceRefs": [
      "F05",
      "F06"
    ],
    "summary": "Ask which local ASD fault, which active pipe(s), exact code and restore time.",
    "revision": "2026-11-02.1",
    "reviewStatus": "generic-reviewed",
    "provenance": "Adapted from user-supplied FINDR research and implementation brief v1.0; question order is FINDR product design, not a manufacturer procedure.",
    "sourceBriefStatus": "Supplied research text. Model-specific examples require separate verification and are not enabled comparators.",
    "rules": [
      {
        "id": "F09.Q1",
        "revision": "2026-11-02.1",
        "routeId": "F09",
        "family": "F",
        "question": "Is the local aspirating detector fault active now?",
        "why": "A normal host panel cannot erase a pipe-specific fault recorded earlier.",
        "testTemplate": "display",
        "evidenceToCollect": [
          "Local code",
          "Pipe number",
          "Event/restore time",
          "Clock offset",
          "Current host state"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "F09.Q2",
        "noTarget": "P08",
        "unknownTarget": "P08",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "F05",
          "F06"
        ]
      },
      {
        "id": "F09.Q2",
        "revision": "2026-11-02.1",
        "routeId": "F09",
        "family": "F",
        "question": "Is the flow change confined to one active pipe?",
        "why": "One pipe suggests a different search scope from a common aspirator, filter or pressure change.",
        "testTemplate": "airflow",
        "evidenceToCollect": [
          "Per-pipe values and units",
          "Commissioned baseline",
          "Active configuration",
          "Filter/aspirator status"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "F09.Q3",
        "noTarget": "P03",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "F05",
          "F06"
        ]
      },
      {
        "id": "F09.Q3",
        "revision": "2026-11-02.1",
        "routeId": "F09",
        "family": "F",
        "question": "Is there an accessible physical change on the affected pipe route?",
        "why": "A joint, restriction or pressure effect remains a hypothesis until the route and performance are checked.",
        "testTemplate": "observation",
        "evidenceToCollect": [
          "Joints/holes/end cap",
          "HVAC state",
          "Building work",
          "Far-end access",
          "Required transport verification"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "handover",
        "noTarget": "P08",
        "unknownTarget": "handover",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "F05",
          "F06"
        ]
      }
    ],
    "closeout": [
      "After authorised repair, compare with design and verify sampling/transport performance using the prescribed method.",
      "Keep the incident outcome separate from restoration; retain unresolved evidence and the named next action."
    ]
  },
  {
    "id": "F10",
    "title": "Beam detector fault, alignment or obstruction",
    "sourceBrief": "Ask exact model and indicator sequence. Distinguish fault from fire, obstruction from alignment/compensation, and beam detector from a conventional zone reporting its relay. Log mounting/reflector, sight line, stock lifts, temporary obstruction, sunlight/condensation, optics and mounting movement. If the local beam is healthy but the host remains in fault, investigate relay wiring/supply/EOL. If the beam itself reports fault, consult the matched indicator table before alignment. Obtain safe access and approved optical test method. Verify fire and fault reporting at both device and panel. [REF F07, F01, S04]",
    "systems": [
      "fire"
    ],
    "sourceRefs": [
      "F07",
      "F01",
      "S04"
    ],
    "summary": "Ask exact model and indicator sequence.",
    "revision": "2026-11-02.1",
    "reviewStatus": "generic-reviewed",
    "provenance": "Adapted from user-supplied FINDR research and implementation brief v1.0; question order is FINDR product design, not a manufacturer procedure.",
    "sourceBriefStatus": "Supplied research text. Model-specific examples require separate verification and are not enabled comparators.",
    "rules": [
      {
        "id": "F10.Q1",
        "revision": "2026-11-02.1",
        "routeId": "F10",
        "family": "F",
        "question": "Does the beam detector itself report a fault?",
        "why": "A healthy beam with a host fault directs attention to the interface, supply or supervised zone.",
        "testTemplate": "display",
        "evidenceToCollect": [
          "Beam model",
          "Exact indicator sequence",
          "Host event",
          "Time"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "F10.Q2",
        "noTarget": "F12",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "F07",
          "F01",
          "S04"
        ]
      },
      {
        "id": "F10.Q2",
        "revision": "2026-11-02.1",
        "routeId": "F10",
        "family": "F",
        "question": "Is there a visible obstruction or mounting change on the sight line?",
        "why": "Obstruction and movement should be recorded before assuming alignment or electronics failure.",
        "testTemplate": "observation",
        "evidenceToCollect": [
          "Sight line",
          "Stock/lifts",
          "Reflector",
          "Mounting",
          "Condensation/lighting"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "F10.Q3",
        "noTarget": "manual",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "F07",
          "F01",
          "S04"
        ]
      },
      {
        "id": "F10.Q3",
        "revision": "2026-11-02.1",
        "routeId": "F10",
        "family": "F",
        "question": "Did the approved check verify the required beam response at the host panel?",
        "why": "Local status alone cannot prove the fire/fault reporting path.",
        "testTemplate": "functional",
        "evidenceToCollect": [
          "Approved optical method",
          "Local and host response",
          "Witness",
          "Safe access",
          "Restoration"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "impairment",
          "exactProfile"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "handover",
        "noTarget": "F12",
        "unknownTarget": "handover",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T1",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "F07",
          "F01",
          "S04"
        ]
      }
    ],
    "closeout": [
      "Verify fire and fault reporting at both device and panel.",
      "Keep the incident outcome separate from restoration; retain unresolved evidence and the named next action."
    ]
  },
  {
    "id": "F11",
    "title": "Panel network/repeater/node communications lost",
    "sourceBrief": "Ask whether local panels still function and whether loss is one node, one path or the network. Capture node IDs, exact peer messages, timestamps, physical medium, topology/redundancy, interface/card power/status, last extension/firmware change and local event visibility at peers. One dark node → check local source and link. Devices all normal locally but remote events absent → investigate inter-panel path/compatibility. Never infer that local operation proves networked cause-and-effect. Obtain cross-node functional verification before closure. [REF F03–F04, P01]",
    "systems": [
      "fire"
    ],
    "sourceRefs": [
      "F03",
      "F04",
      "P01"
    ],
    "summary": "Ask whether local panels still function and whether loss is one node, one path or the network.",
    "revision": "2026-11-02.1",
    "reviewStatus": "generic-reviewed",
    "provenance": "Adapted from user-supplied FINDR research and implementation brief v1.0; question order is FINDR product design, not a manufacturer procedure.",
    "sourceBriefStatus": "Supplied research text. Model-specific examples require separate verification and are not enabled comparators.",
    "rules": [
      {
        "id": "F11.Q1",
        "revision": "2026-11-02.1",
        "routeId": "F11",
        "family": "F",
        "question": "Does the affected node still perform its local functions?",
        "why": "Local loss and inter-panel event loss are different failure boundaries.",
        "testTemplate": "display",
        "evidenceToCollect": [
          "Node ID",
          "Local function",
          "Exact peer message",
          "Clocked events"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "F11.Q2",
        "noTarget": "P01",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "F03",
          "F04",
          "P01"
        ]
      },
      {
        "id": "F11.Q2",
        "revision": "2026-11-02.1",
        "routeId": "F11",
        "family": "F",
        "question": "Is the communication loss confined to one confirmed network path?",
        "why": "The actual medium and redundancy decide whether a boundary can be scoped.",
        "testTemplate": "network",
        "evidenceToCollect": [
          "Physical medium",
          "Node topology",
          "Interface power/status",
          "Recent extension/firmware"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "F11.Q3",
        "noTarget": "P01",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "F03",
          "F04",
          "P01"
        ]
      },
      {
        "id": "F11.Q3",
        "revision": "2026-11-02.1",
        "routeId": "F11",
        "family": "F",
        "question": "Was the required event received by the intended peer during an authorised check?",
        "why": "Local operation does not prove networked cause-and-effect.",
        "testTemplate": "functional",
        "evidenceToCollect": [
          "Originating event",
          "Peer receipt",
          "Time",
          "Cross-node function",
          "Outstanding path"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "impairment"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "handover",
        "noTarget": "handover",
        "unknownTarget": "handover",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T1",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "F03",
          "F04",
          "P01"
        ]
      }
    ],
    "closeout": [
      "Obtain cross-node functional verification before closure.",
      "Keep the incident outcome separate from restoration; retain unresolved evidence and the named next action."
    ]
  },
  {
    "id": "F12",
    "title": "Interface commanded but door/plant does not respond",
    "sourceBrief": "Ask which initiating event, approved cause-and-effect row, delay, coincidence, zone/group, inhibit, output module and destination are involved. Capture initiating event → panel command → physical contact/state → downstream controller input or release circuit → observed end action and feedback. If there is no command, examine logic/configuration with the authorised owner. If command and contact change but field action is absent, follow independent power, wiring and actuator at the interface. Report the precise boundary and impact. A door release test also uses A05. Lift/plant/releasing equipment requires G5. [REF F03–F04, A04–A05, S06]",
    "systems": [
      "fire"
    ],
    "sourceRefs": [
      "F03",
      "F04",
      "A04",
      "A05",
      "S06"
    ],
    "summary": "Ask which initiating event, approved cause-and-effect row, delay, coincidence, zone/group, inhibit, output module and destination are involved.",
    "revision": "2026-11-02.1",
    "reviewStatus": "generic-reviewed",
    "provenance": "Adapted from user-supplied FINDR research and implementation brief v1.0; question order is FINDR product design, not a manufacturer procedure.",
    "sourceBriefStatus": "Supplied research text. Model-specific examples require separate verification and are not enabled comparators.",
    "rules": [
      {
        "id": "F12.Q1",
        "revision": "2026-11-02.1",
        "routeId": "F12",
        "family": "F",
        "question": "Did the panel issue the intended output command for this event?",
        "why": "No command directs the investigation to approved logic; a command keeps the downstream path in scope.",
        "testTemplate": "display",
        "evidenceToCollect": [
          "Initiating event",
          "Cause-and-effect row",
          "Delay/coincidence",
          "Inhibit",
          "Output module"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "F12.Q2",
        "noTarget": "manual",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "F03",
          "F04",
          "A04",
          "A05",
          "S06"
        ]
      },
      {
        "id": "F12.Q2",
        "revision": "2026-11-02.1",
        "routeId": "F12",
        "family": "F",
        "question": "Did the output's physical contact or state change during that command?",
        "why": "Command, contact movement and final action are separate evidence.",
        "testTemplate": "contact",
        "evidenceToCollect": [
          "Physical contact/state",
          "Test method",
          "Independent feed",
          "Actual time"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "impairment"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "F12.Q3",
        "noTarget": "handover",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T1",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "F03",
          "F04",
          "A04",
          "A05",
          "S06"
        ]
      },
      {
        "id": "F12.Q3",
        "revision": "2026-11-02.1",
        "routeId": "F12",
        "family": "F",
        "question": "Did the destination perform its required physical action?",
        "why": "An interface transition cannot prove a door, plant or releasing function worked.",
        "testTemplate": "functional",
        "evidenceToCollect": [
          "Destination action",
          "Feedback",
          "System owner",
          "Service impact",
          "Restoration"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "impairment",
          "specialist",
          "exactProfile"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "handover",
        "noTarget": "handover",
        "unknownTarget": "handover",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T1",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "F03",
          "F04",
          "A04",
          "A05",
          "S06"
        ]
      }
    ],
    "closeout": [
      "Lift/plant/releasing equipment requires G5.",
      "Keep the incident outcome separate from restoration; retain unresolved evidence and the named next action."
    ]
  },
  {
    "id": "F13",
    "title": "Local fire event works but remote transmission fails",
    "sourceBrief": "Ask which separately monitored functions should be transmitted (fire, fault, restore), whether ARC test was arranged and which account/path received which signal. Log panel output, communicator input, power, path status, timestamp/clock offset and actual ARC confirmation. If panel event occurred but communicator input did not change, investigate interface/wiring. If communicator saw it and ARC did not, take the path/provider branch I11. Do not generate an unscheduled test call or accept “connected” as proof of delivery. Verify correct transmission and restoration. [REF I04, S04–S05]",
    "systems": [
      "fire"
    ],
    "sourceRefs": [
      "I04",
      "S04",
      "S05"
    ],
    "summary": "Ask which separately monitored functions should be transmitted (fire, fault, restore), whether ARC test was arranged and which account/path received which signal.",
    "revision": "2026-11-02.1",
    "reviewStatus": "generic-reviewed",
    "provenance": "Adapted from user-supplied FINDR research and implementation brief v1.0; question order is FINDR product design, not a manufacturer procedure.",
    "sourceBriefStatus": "Supplied research text. Model-specific examples require separate verification and are not enabled comparators.",
    "rules": [
      {
        "id": "F13.Q1",
        "revision": "2026-11-02.1",
        "routeId": "F13",
        "family": "F",
        "question": "Did the communicator record the same local fire event at its input?",
        "why": "This separates the panel/interface boundary from transmission and provider delivery.",
        "testTemplate": "display",
        "evidenceToCollect": [
          "Panel event",
          "Communicator input",
          "Time offset",
          "Expected event type"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "F13.Q2",
        "noTarget": "F12",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "I04",
          "S04",
          "S05"
        ]
      },
      {
        "id": "F13.Q2",
        "revision": "2026-11-02.1",
        "routeId": "F13",
        "family": "F",
        "question": "Did the ARC confirm receipt of that matching event?",
        "why": "Connected status is not evidence that the intended event reached the receiving centre.",
        "testTemplate": "observation",
        "evidenceToCollect": [
          "Receipt reference",
          "Event/account alias",
          "Path",
          "ARC time",
          "Witness role"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "F13.Q3",
        "noTarget": "I11",
        "unknownTarget": "handover",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "I04",
          "S04",
          "S05"
        ]
      },
      {
        "id": "F13.Q3",
        "revision": "2026-11-02.1",
        "routeId": "F13",
        "family": "F",
        "question": "Did the ARC confirm the matching restore after the arranged test?",
        "why": "An event receipt does not prove restoration or that monitoring is off test.",
        "testTemplate": "observation",
        "evidenceToCollect": [
          "Restore receipt",
          "Test arrangement",
          "Monitoring state",
          "Acknowledgement owner"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "handover",
        "noTarget": "I11",
        "unknownTarget": "handover",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "I04",
          "S04",
          "S05"
        ]
      }
    ],
    "closeout": [
      "Verify correct transmission and restoration.",
      "Keep the incident outcome separate from restoration; retain unresolved evidence and the named next action."
    ]
  },
  {
    "id": "F14",
    "title": "Wireless fire device missing, tamper or battery",
    "sourceBrief": "Ask if a single device or all children of a translator/expander are lost. Log signal/quality and timestamp from the compatible tool, battery type/status, tamper, translator power/loop, parent, recent structural changes and neighbouring healthy devices. Group lost → check common translator/expander before declaring multiple devices faulty. Single lost → compare predicted/actual RF path, enclosure, battery and tamper. An old signal snapshot cannot prove present coverage. Verify supervision and agreed fire function after repair. [REF F08, F02]",
    "systems": [
      "fire"
    ],
    "sourceRefs": [
      "F08",
      "F02"
    ],
    "summary": "Ask if a single device or all children of a translator/expander are lost.",
    "revision": "2026-11-02.1",
    "reviewStatus": "generic-reviewed",
    "provenance": "Adapted from user-supplied FINDR research and implementation brief v1.0; question order is FINDR product design, not a manufacturer procedure.",
    "sourceBriefStatus": "Supplied research text. Model-specific examples require separate verification and are not enabled comparators.",
    "rules": [
      {
        "id": "F14.Q1",
        "revision": "2026-11-02.1",
        "routeId": "F14",
        "family": "F",
        "question": "Are multiple lost devices children of the same translator or expander?",
        "why": "A common parent is a better first boundary than simultaneous independent detector faults.",
        "testTemplate": "display",
        "evidenceToCollect": [
          "Parent identity",
          "Lost devices",
          "First event",
          "Current message times"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "F14.Q2",
        "noTarget": "F14.Q3",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "F08",
          "F02"
        ]
      },
      {
        "id": "F14.Q2",
        "revision": "2026-11-02.1",
        "routeId": "F14",
        "family": "F",
        "question": "Does the common translator report a current fault?",
        "why": "An upstream parent condition can explain a group loss without proving all children defective.",
        "testTemplate": "display",
        "evidenceToCollect": [
          "Translator status",
          "Supply domain",
          "Loop communication",
          "Timestamp"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "manual",
        "noTarget": "F14.Q3",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "F08",
          "F02"
        ]
      },
      {
        "id": "F14.Q3",
        "revision": "2026-11-02.1",
        "routeId": "F14",
        "family": "F",
        "question": "Has a current message been received from the device at its installed position?",
        "why": "An old signal snapshot cannot establish current radio supervision or coverage.",
        "testTemplate": "functional",
        "evidenceToCollect": [
          "Battery/tamper",
          "Qualified RF metric",
          "Installed position",
          "Current message",
          "Required fire retest"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "impairment"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "handover",
        "noTarget": "manual",
        "unknownTarget": "handover",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T1",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "F08",
          "F02"
        ]
      }
    ],
    "closeout": [
      "Verify supervision and agreed fire function after repair.",
      "Keep the incident outcome separate from restoration; retain unresolved evidence and the named next action."
    ]
  },
  {
    "id": "F15",
    "title": "Hazardous-area sounder/barrier or specialist interface",
    "sourceBrief": "Ask location classification, barrier/isolator and device exact model, approved design/control drawing, permitted instrument and test point, safe-side input/output relationship, supply channel and fault indication. Unknown authorisation/design → record safe-side observations and escalate to the competent specialist. Do not infer how many devices one barrier supports, suggest generic continuity testing in the area, or substitute a standard sounder. Verify restoration through the authorised procedure for that installation. [REF S07, F03, P01]",
    "systems": [
      "fire"
    ],
    "sourceRefs": [
      "S07",
      "F03",
      "P01"
    ],
    "summary": "Ask location classification, barrier/isolator and device exact model, approved design/control drawing, permitted instrument and test point, safe-side input/output relationship, supply channel and fault indication.",
    "revision": "2026-11-02.1",
    "reviewStatus": "generic-reviewed",
    "provenance": "Adapted from user-supplied FINDR research and implementation brief v1.0; question order is FINDR product design, not a manufacturer procedure.",
    "sourceBriefStatus": "Supplied research text. Model-specific examples require separate verification and are not enabled comparators.",
    "rules": [
      {
        "id": "F15.Q1",
        "revision": "2026-11-02.1",
        "routeId": "F15",
        "family": "F",
        "question": "Is a specialist owner identified for this installation?",
        "why": "Unknown hazardous-area authority stops generic field testing while safe-side evidence remains useful.",
        "testTemplate": "observation",
        "evidenceToCollect": [
          "Owner role",
          "Area classification",
          "Affected function",
          "Safe-side indication"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "F15.Q2",
        "noTarget": "handover",
        "unknownTarget": "handover",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "S07",
          "F03",
          "P01"
        ]
      },
      {
        "id": "F15.Q2",
        "revision": "2026-11-02.1",
        "routeId": "F15",
        "family": "F",
        "question": "Does the approved control drawing identify the actual barrier and device combination?",
        "why": "A family name cannot establish an intrinsically safe circuit's permitted equipment or test points.",
        "testTemplate": "observation",
        "evidenceToCollect": [
          "Barrier/device full models",
          "Control drawing",
          "Permitted instrument",
          "Exact test point"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "F15.Q3",
        "noTarget": "manual",
        "unknownTarget": "handover",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "S07",
          "F03",
          "P01"
        ]
      },
      {
        "id": "F15.Q3",
        "revision": "2026-11-02.1",
        "routeId": "F15",
        "family": "F",
        "question": "Has the specialist's authorised verification established the required function?",
        "why": "Specialist restoration must be recorded through the installation's own method.",
        "testTemplate": "functional",
        "evidenceToCollect": [
          "Specialist procedure",
          "Witness",
          "Safe-side relation",
          "Functional outcome",
          "Remaining restriction"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "specialist",
          "impairment",
          "exactProfile"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "handover",
        "noTarget": "handover",
        "unknownTarget": "handover",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T1",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "S07",
          "F03",
          "P01"
        ]
      }
    ],
    "closeout": [
      "Verify restoration through the authorised procedure for that installation.",
      "Keep the incident outcome separate from restoration; retain unresolved evidence and the named next action."
    ]
  },
  {
    "id": "A01",
    "title": "Token presented, door does not open",
    "sourceBrief": "Ask whether a read event exists for this reader/door/time and whether it says accepted, denied, unknown or nothing. Log local LED/buzzer only as model-specific evidence, event text, same token elsewhere and a known-authorised comparison token at the same reader with permission. No event → A02/A06. Denied → A03. Granted → log controller output and physical response, then A04. A working exit button narrows the issue but may operate a different path. [REF A02, A07]",
    "systems": [
      "access"
    ],
    "sourceRefs": [
      "A02",
      "A07"
    ],
    "summary": "Ask whether a read event exists for this reader/door/time and whether it says accepted, denied, unknown or nothing.",
    "revision": "2026-11-02.1",
    "reviewStatus": "generic-reviewed",
    "provenance": "Adapted from user-supplied FINDR research and implementation brief v1.0; question order is FINDR product design, not a manufacturer procedure.",
    "sourceBriefStatus": "Supplied research text. Model-specific examples require separate verification and are not enabled comparators.",
    "rules": [
      {
        "id": "A01.Q1",
        "revision": "2026-11-02.1",
        "routeId": "A01",
        "family": "A",
        "question": "Is there a read event for this reader at the time of this presentation?",
        "why": "No event differs from a policy denial or a granted request.",
        "testTemplate": "display",
        "evidenceToCollect": [
          "Door/reader",
          "Event text",
          "Time",
          "Local indication",
          "No credential secrets"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "A01.Q2",
        "noTarget": "A02",
        "unknownTarget": "A01.Q3",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "A02",
          "A07"
        ]
      },
      {
        "id": "A01.Q2",
        "revision": "2026-11-02.1",
        "routeId": "A01",
        "family": "A",
        "question": "Did that event grant access?",
        "why": "An explicit grant redirects to the actual output and lock path; denial directs to entitlement.",
        "testTemplate": "display",
        "evidenceToCollect": [
          "Decision",
          "Door",
          "Attempt time",
          "Token role alias"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "A04",
        "noTarget": "A03",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "A02",
          "A07"
        ]
      },
      {
        "id": "A01.Q3",
        "revision": "2026-11-02.1",
        "routeId": "A01",
        "family": "A",
        "question": "Does a permitted known-authorised comparator produce a read event here?",
        "why": "A controlled comparator separates a single credential issue from reader/path behaviour.",
        "testTemplate": "observation",
        "evidenceToCollect": [
          "Comparator role",
          "Same reader/time",
          "Permission",
          "Outcome without credential value"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "A03",
        "noTarget": "A02",
        "unknownTarget": "handover",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "A02",
          "A07"
        ]
      }
    ],
    "closeout": [
      "A working exit button narrows the issue but may operate a different path.",
      "Keep the incident outcome separate from restoration; retain unresolved evidence and the named next action."
    ]
  },
  {
    "id": "A02",
    "title": "Reader dark, no read or intermittent read",
    "sourceBrief": "Ask if controller and reader are powered during failure, all credentials vs one technology, reader protocol, cable extension and common reference per device drawing. Log reader supply at its terminals, status, controller input activity, reader port and state of comparable reader. Reader unpowered → trace supply and return. Powered without event → check actual protocol, physical link and compatible token. On OSDP use matched address/baud/secure-channel diagnostic if supported, on Wiegand use its wiring and format. Avoid logging keys or complete credentials. [REF A02, A06–A08, P03]",
    "systems": [
      "access"
    ],
    "sourceRefs": [
      "A02",
      "A06",
      "A07",
      "A08",
      "P03"
    ],
    "summary": "Ask if controller and reader are powered during failure, all credentials vs one technology, reader protocol, cable extension and common reference per device drawing.",
    "revision": "2026-11-02.1",
    "reviewStatus": "generic-reviewed",
    "provenance": "Adapted from user-supplied FINDR research and implementation brief v1.0; question order is FINDR product design, not a manufacturer procedure.",
    "sourceBriefStatus": "Supplied research text. Model-specific examples require separate verification and are not enabled comparators.",
    "rules": [
      {
        "id": "A02.Q1",
        "revision": "2026-11-02.1",
        "routeId": "A02",
        "family": "A",
        "question": "Is the reader powered during the reported failure?",
        "why": "Missing local power selects supply/return evidence rather than protocol assumptions.",
        "testTemplate": "observation",
        "evidenceToCollect": [
          "Reader identity",
          "Visible state",
          "Supply evidence",
          "Failure time"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "A02.Q2",
        "noTarget": "P03",
        "unknownTarget": "P03",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "A02",
          "A06",
          "A07",
          "A08",
          "P03"
        ]
      },
      {
        "id": "A02.Q2",
        "revision": "2026-11-02.1",
        "routeId": "A02",
        "family": "A",
        "question": "Is the actual reader protocol identified from the installed equipment?",
        "why": "OSDP and Wiegand observations cannot be interchanged.",
        "testTemplate": "observation",
        "evidenceToCollect": [
          "Protocol",
          "Controller port",
          "Reader model",
          "Cable extension",
          "Common reference drawing"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "A02.Q3",
        "noTarget": "manual",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "A02",
          "A06",
          "A07",
          "A08",
          "P03"
        ]
      },
      {
        "id": "A02.Q3",
        "revision": "2026-11-02.1",
        "routeId": "A02",
        "family": "A",
        "question": "Does the controller record any input activity from this reader during presentation?",
        "why": "Powered equipment without received input keeps physical link, compatible token and protocol in scope.",
        "testTemplate": "display",
        "evidenceToCollect": [
          "Current input activity",
          "Same-attempt time",
          "Comparable reader",
          "Supported diagnostic"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "A03",
        "noTarget": "A06",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "A02",
          "A06",
          "A07",
          "A08",
          "P03"
        ]
      }
    ],
    "closeout": [
      "Avoid logging keys or complete credentials.",
      "Keep the incident outcome separate from restoration; retain unresolved evidence and the named next action."
    ]
  },
  {
    "id": "A03",
    "title": "Access denied / new token works elsewhere",
    "sourceBrief": "Ask exact denial text and event time. Log access level, time profile, reader direction, expiry/disablement, anti-passback/interlock or lockdown rules if installed, ACU online state, sync status, test-token role and clock. One user only → compare entitlement and credential type. All users on one door → look at policy, controller time/config sync or reader mapping. Granted event redirects to A04. Changes require customer authority and a before/after record. Never suggest broadly granting access to test a denial. [REF A02, A07]",
    "systems": [
      "access"
    ],
    "sourceRefs": [
      "A02",
      "A07"
    ],
    "summary": "Ask exact denial text and event time.",
    "revision": "2026-11-02.1",
    "reviewStatus": "generic-reviewed",
    "provenance": "Adapted from user-supplied FINDR research and implementation brief v1.0; question order is FINDR product design, not a manufacturer procedure.",
    "sourceBriefStatus": "Supplied research text. Model-specific examples require separate verification and are not enabled comparators.",
    "rules": [
      {
        "id": "A03.Q1",
        "revision": "2026-11-02.1",
        "routeId": "A03",
        "family": "A",
        "question": "Does the denial affect only one authorised user role?",
        "why": "A single-role pattern differs from all users being denied at one door.",
        "testTemplate": "display",
        "evidenceToCollect": [
          "Exact denial",
          "Role alias",
          "Door",
          "Time",
          "Other authorised comparisons"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "A03.Q2",
        "noTarget": "A03.Q3",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "A02",
          "A07"
        ]
      },
      {
        "id": "A03.Q2",
        "revision": "2026-11-02.1",
        "routeId": "A03",
        "family": "A",
        "question": "Does the recorded entitlement permit this door at this time?",
        "why": "Entitlement, expiry and schedule evidence can explain a denial without broad access changes.",
        "testTemplate": "observation",
        "evidenceToCollect": [
          "Access level",
          "Time profile",
          "Expiry/disablement",
          "Direction",
          "No credential contents"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "A03.Q3",
        "noTarget": "handover",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "A02",
          "A07"
        ]
      },
      {
        "id": "A03.Q3",
        "revision": "2026-11-02.1",
        "routeId": "A03",
        "family": "A",
        "question": "Has the controller received the intended current configuration?",
        "why": "Clock or sync issues can affect the policy actually used at the door.",
        "testTemplate": "display",
        "evidenceToCollect": [
          "Controller clock",
          "Sync state",
          "Policy revision",
          "Anti-passback/interlock state"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "handover",
        "noTarget": "A06",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "A02",
          "A07"
        ]
      }
    ],
    "closeout": [
      "Never suggest broadly granting access to test a denial.",
      "Keep the incident outcome separate from restoration; retain unresolved evidence and the named next action."
    ]
  },
  {
    "id": "A04",
    "title": "Access granted, relay clicks, lock fails",
    "sourceBrief": "Ask relay type (volt-free/dry, powered output, controller-specific), contact chosen COM/NO/NC and independent lock feed. Log controller command, source +/−, COM relative to the actual lock PSU return, switched NO/NC relative to that same return, and voltage across lock +/−, locked/requested/released with load connected. Log what physically happened. First identify whether positive or return is switched and which terminal is upstream. Expected feed missing at its upstream contact → trace fuse/feed. Correct upstream state but outgoing terminal does not follow the command → verify contact choice/wiring/relay. Terminal switches but lock +/− does not follow → trace cable, emergency-release chain, return and alternate feeds. Correct drive but no movement → inspect lock/strike alignment or loading. A dry contact does not produce its own supply. [REF A01–A02, A07, P03]",
    "systems": [
      "access"
    ],
    "sourceRefs": [
      "A01",
      "A02",
      "A07",
      "P03"
    ],
    "summary": "Ask relay type (volt-free/dry, powered output, controller-specific), contact chosen COM/NO/NC and independent lock feed.",
    "revision": "2026-11-02.1",
    "reviewStatus": "generic-reviewed",
    "provenance": "Adapted from user-supplied FINDR research and implementation brief v1.0; question order is FINDR product design, not a manufacturer procedure.",
    "sourceBriefStatus": "Supplied research text. Model-specific examples require separate verification and are not enabled comparators.",
    "rules": [
      {
        "id": "A04.Q1",
        "revision": "2026-11-02.1",
        "routeId": "A04",
        "family": "A",
        "question": "Did the controller record a grant for this attempt?",
        "why": "A click alone does not establish a grant or physical release.",
        "testTemplate": "display",
        "evidenceToCollect": [
          "Door and attempt time",
          "Grant event",
          "Command",
          "Physical response"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "A04.Q2",
        "noTarget": "A01",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "A01",
          "A02",
          "A07",
          "P03"
        ]
      },
      {
        "id": "A04.Q2",
        "revision": "2026-11-02.1",
        "routeId": "A04",
        "family": "A",
        "question": "Is the actual lock supply and switching side identified?",
        "why": "A dry contact supplies no power, and a switched return can place COM near DC zero.",
        "testTemplate": "observation",
        "evidenceToCollect": [
          "Dry/powered output",
          "COM/NO/NC",
          "Independent PSU",
          "Positive or return switched",
          "Approved lock mode"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "A04.Q3",
        "noTarget": "manual",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "A01",
          "A02",
          "A07",
          "P03"
        ]
      },
      {
        "id": "A04.Q3",
        "revision": "2026-11-02.1",
        "routeId": "A04",
        "family": "A",
        "question": "Did voltage across the connected lock change during that same request?",
        "why": "The actual loaded lock pair separates an upstream switching-path issue from downstream mechanical behaviour.",
        "testTemplate": "voltage",
        "evidenceToCollect": [
          "Lock +/− normal/request values",
          "Same load state",
          "PSU reference",
          "Physical door movement"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "energised",
          "instrument"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "A04.Q4",
        "noTarget": "P03",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T1",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "A01",
          "A02",
          "A07",
          "P03"
        ]
      },
      {
        "id": "A04.Q4",
        "revision": "2026-11-02.1",
        "routeId": "A04",
        "family": "A",
        "question": "Did the recorded lock drive follow its documented release state?",
        "why": "Correct drive with failed movement supports mechanical or second-lock investigation without proving a particular component.",
        "testTemplate": "observation",
        "evidenceToCollect": [
          "Documented lock mode",
          "Actual drive state",
          "Observed movement",
          "Second-lock or binding evidence"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "A09",
        "noTarget": "P03",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "A01",
          "A02",
          "A07",
          "P03"
        ]
      }
    ],
    "closeout": [
      "A dry contact does not produce its own supply.",
      "Keep the incident outcome separate from restoration; retain unresolved evidence and the named next action."
    ]
  },
  {
    "id": "A05",
    "title": "Escape door fails to release on fire/emergency demand",
    "sourceBrief": "Escalate the failed escape function immediately under G0/G1. Identify whether this is a lock that must release, a hold-open magnet that must let a door close, or a mechanically free-egress door. Identify each required action from the site strategy. Log actual physical escape/closure, initiating event, fire relay, hardwired release path or controller/server logic, local emergency release if fitted, PSU(s), lock voltage/state and reset sequence. Where Paxton’s software integration is used, its server dependency matters. Emergency hardware and site design must be assessed separately. A relay transition with a lock still powered leaves the path impaired. Arrange approved end-to-end retest at each affected door and record responsible-person acceptance. [REF A04–A05, F03, S04, S06]",
    "systems": [
      "access"
    ],
    "sourceRefs": [
      "A04",
      "A05",
      "F03",
      "S04",
      "S06"
    ],
    "summary": "Escalate the failed escape function immediately under G0/G1.",
    "revision": "2026-11-02.1",
    "reviewStatus": "generic-reviewed",
    "provenance": "Adapted from user-supplied FINDR research and implementation brief v1.0; question order is FINDR product design, not a manufacturer procedure.",
    "sourceBriefStatus": "Supplied research text. Model-specific examples require separate verification and are not enabled comparators.",
    "rules": [
      {
        "id": "A05.Q1",
        "revision": "2026-11-02.1",
        "routeId": "A05",
        "family": "A",
        "question": "Is the required escape or door-closure function currently unavailable?",
        "why": "A failed required function takes priority over routine diagnostics regardless of relay indications.",
        "testTemplate": "observation",
        "evidenceToCollect": [
          "Actual physical function",
          "Affected door/area",
          "Site response",
          "Notification owner"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "handover",
        "noTarget": "A05.Q2",
        "unknownTarget": "handover",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "A04",
          "A05",
          "F03",
          "S04",
          "S06"
        ]
      },
      {
        "id": "A05.Q2",
        "revision": "2026-11-02.1",
        "routeId": "A05",
        "family": "A",
        "question": "Does the approved site strategy identify the required action for this door?",
        "why": "Release, hold-open closure and mechanically free egress are different functions.",
        "testTemplate": "observation",
        "evidenceToCollect": [
          "Door purpose",
          "Cause-and-effect",
          "Hardwired or software path",
          "Independent emergency hardware"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "A05.Q3",
        "noTarget": "manual",
        "unknownTarget": "handover",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "A04",
          "A05",
          "F03",
          "S04",
          "S06"
        ]
      },
      {
        "id": "A05.Q3",
        "revision": "2026-11-02.1",
        "routeId": "A05",
        "family": "A",
        "question": "Has the complete required door function been witnessed under the approved retest?",
        "why": "Only physical end-to-end evidence can verify the required action; contact movement alone cannot.",
        "testTemplate": "functional",
        "evidenceToCollect": [
          "Initiating event",
          "Physical response",
          "Server dependency if applicable",
          "Responsible-person acceptance",
          "Remaining impairment"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "impairment",
          "specialist",
          "exactProfile"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "handover",
        "noTarget": "handover",
        "unknownTarget": "handover",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T1",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "A04",
          "A05",
          "F03",
          "S04",
          "S06"
        ]
      }
    ],
    "closeout": [
      "Arrange approved end-to-end retest at each affected door and record responsible-person acceptance.",
      "Keep the incident outcome separate from restoration; retain unresolved evidence and the named next action."
    ]
  },
  {
    "id": "A06",
    "title": "ACU offline / messages pending / several doors down after extension",
    "sourceBrief": "Ask one ACU, downstream group or all controllers, TCP/IP vs RS485, and whether access still works locally. Log last communication, server service and network interface state, ACU LEDs/power, topology, bus end positions, new spur/extension, converter type, recent change, event backlog and last configuration received. One segment lost → identify boundary on the physical data line. All lost → check common host/interface/supply first. Paxton Net2 RS485 termination checks are conditional on its topology, cable and isolated setup. Do not apply them to OSDP or intruder buses. After repair verify event upload, authorised credential operation and current configuration at the door. [REF A03–A04, A07]",
    "systems": [
      "access"
    ],
    "sourceRefs": [
      "A03",
      "A04",
      "A07"
    ],
    "summary": "Ask one ACU, downstream group or all controllers, TCP/IP vs RS485, and whether access still works locally.",
    "revision": "2026-11-02.1",
    "reviewStatus": "generic-reviewed",
    "provenance": "Adapted from user-supplied FINDR research and implementation brief v1.0; question order is FINDR product design, not a manufacturer procedure.",
    "sourceBriefStatus": "Supplied research text. Model-specific examples require separate verification and are not enabled comparators.",
    "rules": [
      {
        "id": "A06.Q1",
        "revision": "2026-11-02.1",
        "routeId": "A06",
        "family": "A",
        "question": "Does access still work locally at the offline controller?",
        "why": "Local operation and event/configuration delivery are distinct functions.",
        "testTemplate": "observation",
        "evidenceToCollect": [
          "Controller ID",
          "Local operation",
          "Last communication",
          "Messages pending"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "A06.Q2",
        "noTarget": "P01",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "A03",
          "A04",
          "A07"
        ]
      },
      {
        "id": "A06.Q2",
        "revision": "2026-11-02.1",
        "routeId": "A06",
        "family": "A",
        "question": "Is the loss confined to a confirmed physical communications segment?",
        "why": "A downstream group after an extension differs from total host/interface loss.",
        "testTemplate": "network",
        "evidenceToCollect": [
          "TCP/IP or RS485",
          "Physical topology",
          "Bus ends",
          "New spur",
          "Converter",
          "Host/interface status"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "A06.Q3",
        "noTarget": "P01",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "A03",
          "A04",
          "A07"
        ]
      },
      {
        "id": "A06.Q3",
        "revision": "2026-11-02.1",
        "routeId": "A06",
        "family": "A",
        "question": "Has event delivery resumed from the affected controller?",
        "why": "Normal local access cannot establish that queued events or current configuration reached their destinations.",
        "testTemplate": "display",
        "evidenceToCollect": [
          "Event upload",
          "Config revision",
          "Controller clock",
          "Credential function",
          "Remaining backlog"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "handover",
        "noTarget": "handover",
        "unknownTarget": "handover",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "A03",
          "A04",
          "A07"
        ]
      }
    ],
    "closeout": [
      "After repair verify event upload, authorised credential operation and current configuration at the door.",
      "Keep the incident outcome separate from restoration; retain unresolved evidence and the named next action."
    ]
  },
  {
    "id": "A07",
    "title": "RTE works differently from emergency release",
    "sourceBrief": "Identify request-to-exit (RTE) input versus a physical emergency release in the lock supply. Log push-button action, controller input/event, release time, controller relay, local emergency device state and physical door response separately. If RTE input never changes, inspect local contact/wiring and configuration. If it changes and lock does not release, use A04. A working RTE does not validate emergency release. Test the independent emergency path only within the approved site procedure and restore it. [REF A04–A05, A07]",
    "systems": [
      "access"
    ],
    "sourceRefs": [
      "A04",
      "A05",
      "A07"
    ],
    "summary": "Identify request-to-exit (RTE) input versus a physical emergency release in the lock supply.",
    "revision": "2026-11-02.1",
    "reviewStatus": "generic-reviewed",
    "provenance": "Adapted from user-supplied FINDR research and implementation brief v1.0; question order is FINDR product design, not a manufacturer procedure.",
    "sourceBriefStatus": "Supplied research text. Model-specific examples require separate verification and are not enabled comparators.",
    "rules": [
      {
        "id": "A07.Q1",
        "revision": "2026-11-02.1",
        "routeId": "A07",
        "family": "A",
        "question": "Does the controller input change when the RTE button is operated under the agreed test?",
        "why": "A physical button and a received input are different boundaries.",
        "testTemplate": "contact",
        "evidenceToCollect": [
          "RTE identity",
          "Input/event",
          "Button action",
          "Test time",
          "Input method"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "impairment"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "A07.Q2",
        "noTarget": "handover",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T1",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "A04",
          "A05",
          "A07"
        ]
      },
      {
        "id": "A07.Q2",
        "revision": "2026-11-02.1",
        "routeId": "A07",
        "family": "A",
        "question": "Does the actual door release on that RTE request?",
        "why": "A received RTE input does not prove lock release.",
        "testTemplate": "functional",
        "evidenceToCollect": [
          "Relay state",
          "Release time",
          "Door response",
          "Lock mode"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "impairment"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "A07.Q3",
        "noTarget": "A04",
        "unknownTarget": "handover",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T1",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "A04",
          "A05",
          "A07"
        ]
      },
      {
        "id": "A07.Q3",
        "revision": "2026-11-02.1",
        "routeId": "A07",
        "family": "A",
        "question": "Is there separate evidence that the required emergency-release function worked?",
        "why": "A working RTE must not be used as a substitute for independent emergency-path verification.",
        "testTemplate": "observation",
        "evidenceToCollect": [
          "Independent path",
          "Approved test record",
          "Physical outcome",
          "Restoration"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "handover",
        "noTarget": "A05",
        "unknownTarget": "handover",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "A04",
          "A05",
          "A07"
        ]
      }
    ],
    "closeout": [
      "Test the independent emergency path only within the approved site procedure and restore it.",
      "Keep the incident outcome separate from restoration; retain unresolved evidence and the named next action."
    ]
  },
  {
    "id": "A08",
    "title": "Door forced / held / contact appears inverted",
    "sourceBrief": "Ask what the leaf physically did at the event time and whether access had been granted. Log contact/magnet alignment, closed/open input at ACU, sensor type and wiring mode, debounce/held time if documented, door closer/latch and event order. If the leaf shuts but input stays open, investigate contact, alignment or input path. If the input changes correctly but an alarm persists, investigate timing/policy. If the leaf itself fails to close/latch, refer for door hardware. A software timer cannot repair it. [REF A02, A07, S06]",
    "systems": [
      "access"
    ],
    "sourceRefs": [
      "A02",
      "A07",
      "S06"
    ],
    "summary": "Ask what the leaf physically did at the event time and whether access had been granted.",
    "revision": "2026-11-02.1",
    "reviewStatus": "generic-reviewed",
    "provenance": "Adapted from user-supplied FINDR research and implementation brief v1.0; question order is FINDR product design, not a manufacturer procedure.",
    "sourceBriefStatus": "Supplied research text. Model-specific examples require separate verification and are not enabled comparators.",
    "rules": [
      {
        "id": "A08.Q1",
        "revision": "2026-11-02.1",
        "routeId": "A08",
        "family": "A",
        "question": "Did the door leaf physically close at the time of the reported event?",
        "why": "A door that did not close is a hardware observation, not an inverted input diagnosis.",
        "testTemplate": "observation",
        "evidenceToCollect": [
          "Leaf position",
          "Closer/latch",
          "Event time",
          "Grant history"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "A08.Q2",
        "noTarget": "A09",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "A02",
          "A07",
          "S06"
        ]
      },
      {
        "id": "A08.Q2",
        "revision": "2026-11-02.1",
        "routeId": "A08",
        "family": "A",
        "question": "Did the controller's contact input follow that physical door movement?",
        "why": "A mismatch localises investigation towards contact/alignment/input path before timers.",
        "testTemplate": "contact",
        "evidenceToCollect": [
          "Closed/open state",
          "Contact type",
          "Magnet alignment",
          "Wiring mode",
          "Controller input"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "impairment"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "A08.Q3",
        "noTarget": "handover",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T1",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "A02",
          "A07",
          "S06"
        ]
      },
      {
        "id": "A08.Q3",
        "revision": "2026-11-02.1",
        "routeId": "A08",
        "family": "A",
        "question": "Does the recorded event timing agree with the approved held/forced logic?",
        "why": "A correctly changing input with a persistent alarm points towards timing or policy, not a repaired door.",
        "testTemplate": "display",
        "evidenceToCollect": [
          "Event order",
          "Held/debounce settings",
          "Grant time",
          "Approved logic reference"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "handover",
        "noTarget": "manual",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "A02",
          "A07",
          "S06"
        ]
      }
    ],
    "closeout": [
      "A software timer cannot repair it.",
      "Keep the incident outcome separate from restoration; retain unresolved evidence and the named next action."
    ]
  },
  {
    "id": "A09",
    "title": "Lock holds when it should release, or will not resecure",
    "sourceBrief": "Ask design mode, whether only entry or escape is affected, emergency-release/fire state, schedules/free-access period and real mechanical condition. Capture commanded state, lock terminal voltage with load, door-open vs closed behaviour, hold/release timing and any parallel PSU or backfeed. Command absent → permissions/hold logic. Command correct but voltage inconsistent → A04. Voltage correct but latch binds or maglock face misaligned → refer to the appropriate door/lock maintainer. Retest open, close and resecure as well as required escape. [REF A01, A04–A05, A07]",
    "systems": [
      "access"
    ],
    "sourceRefs": [
      "A01",
      "A04",
      "A05",
      "A07"
    ],
    "summary": "Ask design mode, whether only entry or escape is affected, emergency-release/fire state, schedules/free-access period and real mechanical condition.",
    "revision": "2026-11-02.1",
    "reviewStatus": "generic-reviewed",
    "provenance": "Adapted from user-supplied FINDR research and implementation brief v1.0; question order is FINDR product design, not a manufacturer procedure.",
    "sourceBriefStatus": "Supplied research text. Model-specific examples require separate verification and are not enabled comparators.",
    "rules": [
      {
        "id": "A09.Q1",
        "revision": "2026-11-02.1",
        "routeId": "A09",
        "family": "A",
        "question": "Does the commanded state agree with the approved door mode now?",
        "why": "Absent or unintended command directs attention to logic and release states before replacing the lock.",
        "testTemplate": "display",
        "evidenceToCollect": [
          "Command",
          "Free-access/fire/emergency state",
          "Schedules",
          "Approved mode"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "A09.Q2",
        "noTarget": "A03",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "A01",
          "A04",
          "A05",
          "A07"
        ]
      },
      {
        "id": "A09.Q2",
        "revision": "2026-11-02.1",
        "routeId": "A09",
        "family": "A",
        "question": "Does the connected lock voltage follow that intended state?",
        "why": "A voltage mismatch keeps switched path, return or alternate feed in scope.",
        "testTemplate": "voltage",
        "evidenceToCollect": [
          "Lock terminals",
          "Normal/release state",
          "Load",
          "Parallel supply",
          "Time"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "energised",
          "instrument"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "A09.Q3",
        "noTarget": "A04",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T1",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "A01",
          "A04",
          "A05",
          "A07"
        ]
      },
      {
        "id": "A09.Q3",
        "revision": "2026-11-02.1",
        "routeId": "A09",
        "family": "A",
        "question": "Does the leaf physically close to the required position?",
        "why": "Electrical drive alone cannot prove alignment or that the leaf closed.",
        "testTemplate": "functional",
        "evidenceToCollect": [
          "Physical close/resecure",
          "Binding",
          "Second lock",
          "Escape outcome",
          "Appropriate maintainer"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "impairment"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "A09.Q4",
        "noTarget": "handover",
        "unknownTarget": "handover",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T1",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "A01",
          "A04",
          "A05",
          "A07"
        ]
      },
      {
        "id": "A09.Q4",
        "revision": "2026-11-02.1",
        "routeId": "A09",
        "family": "A",
        "question": "Does the closed door resecure as required?",
        "why": "Closing and resecuring are distinct physical outcomes; required escape still needs its own verification.",
        "testTemplate": "functional",
        "evidenceToCollect": [
          "Actual latch or hold",
          "Lock mode",
          "Witness",
          "Required escape outcome",
          "Restoration"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "impairment"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "handover",
        "noTarget": "handover",
        "unknownTarget": "handover",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T1",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "A01",
          "A04",
          "A05",
          "A07"
        ]
      }
    ],
    "closeout": [
      "Retest open, close and resecure as well as required escape.",
      "Keep the incident outcome separate from restoration; retain unresolved evidence and the named next action."
    ]
  },
  {
    "id": "A10",
    "title": "Intercom call works, remote release fails",
    "sourceBrief": "Map call station → master/app → release event/contact → downstream ACU or lock PSU → door. Capture whether audio/video/call setup succeeds, whether release is granted, relay mode/duration, output/contact change, ACU input and physical door operation. Good media with no release command selects permissions/mapping. Command present selects the electrical/mechanical branch. If both call and release fail, investigate common power/network. Exact intercom terminals and menus require the matching intercom manual. Otherwise route only by observation. [REF A01, A07, C04]",
    "systems": [
      "access"
    ],
    "sourceRefs": [
      "A01",
      "A07",
      "C04"
    ],
    "summary": "Map call station → master/app → release event/contact → downstream ACU or lock PSU → door.",
    "revision": "2026-11-02.1",
    "reviewStatus": "generic-reviewed",
    "provenance": "Adapted from user-supplied FINDR research and implementation brief v1.0; question order is FINDR product design, not a manufacturer procedure.",
    "sourceBriefStatus": "Supplied research text. Model-specific examples require separate verification and are not enabled comparators.",
    "rules": [
      {
        "id": "A10.Q1",
        "revision": "2026-11-02.1",
        "routeId": "A10",
        "family": "A",
        "question": "Does the intercom call reach its intended station or client?",
        "why": "Loss of both media and release suggests common power/network before a release-only path.",
        "testTemplate": "observation",
        "evidenceToCollect": [
          "Call station",
          "Master/app",
          "Call time",
          "Audio/video state"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "A10.Q2",
        "noTarget": "C05",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "A01",
          "A07",
          "C04"
        ]
      },
      {
        "id": "A10.Q2",
        "revision": "2026-11-02.1",
        "routeId": "A10",
        "family": "A",
        "question": "Is a release command recorded for the failed attempt?",
        "why": "Good media without a release command points to permissions or mapping.",
        "testTemplate": "display",
        "evidenceToCollect": [
          "Release grant",
          "Client role",
          "Output mapping",
          "Same-attempt time"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "A10.Q3",
        "noTarget": "A03",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "A01",
          "A07",
          "C04"
        ]
      },
      {
        "id": "A10.Q3",
        "revision": "2026-11-02.1",
        "routeId": "A10",
        "family": "A",
        "question": "Does the physical release output change during that command?",
        "why": "Command-to-contact evidence separates intercom output from the downstream ACU or lock path.",
        "testTemplate": "contact",
        "evidenceToCollect": [
          "Relay/contact type",
          "Duration",
          "ACU input",
          "Independent PSU",
          "Door response"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "impairment"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "A04",
        "noTarget": "handover",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T1",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "A01",
          "A07",
          "C04"
        ]
      }
    ],
    "closeout": [
      "Otherwise route only by observation.",
      "Keep the incident outcome separate from restoration; retain unresolved evidence and the named next action."
    ]
  },
  {
    "id": "C01",
    "title": "No power or no Ethernet link",
    "sourceBrief": "Identify the camera and switch port. Record whether the supply is local, standard PoE or proprietary/passive. Check visible indications, neighbours and link state at both ends. Log PSE (power sourcing equipment) model/port admin status, power detection/class/allocation, remaining budget, link up/down and last change. Camera specification and patch points. No power allocated → compatibility, enabled port, pairs and budget. Power allocated but no link → patch/run/device and link errors. Approved comparison with a known-good compatible lead/port/device can divide the path. Avoid arbitrary injectors or supplying power twice. [REF C01–C02, P04]",
    "systems": [
      "cctv"
    ],
    "sourceRefs": [
      "C01",
      "C02",
      "P04"
    ],
    "summary": "Identify the camera and switch port.",
    "revision": "2026-11-02.1",
    "reviewStatus": "generic-reviewed",
    "provenance": "Adapted from user-supplied FINDR research and implementation brief v1.0; question order is FINDR product design, not a manufacturer procedure.",
    "sourceBriefStatus": "Supplied research text. Model-specific examples require separate verification and are not enabled comparators.",
    "rules": [
      {
        "id": "C01.Q1",
        "revision": "2026-11-02.1",
        "routeId": "C01",
        "family": "C",
        "question": "Does the supplying port allocate power to this camera?",
        "why": "Power allocation and link are separate facts, especially with passive or incompatible supplies.",
        "testTemplate": "poe",
        "evidenceToCollect": [
          "PSE model/port",
          "Camera identity",
          "PoE type",
          "Allocation",
          "Budget",
          "Port state"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "C01.Q2",
        "noTarget": "C02",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "C01",
          "C02",
          "P04"
        ]
      },
      {
        "id": "C01.Q2",
        "revision": "2026-11-02.1",
        "routeId": "C01",
        "family": "C",
        "question": "Is Ethernet link reported at both ends of this camera path?",
        "why": "Power present without link keeps patch/run/device evidence in scope.",
        "testTemplate": "network",
        "evidenceToCollect": [
          "Link at both ends",
          "Last transition",
          "Patch points",
          "Port errors"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "C03",
        "noTarget": "C01.Q3",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "C01",
          "C02",
          "P04"
        ]
      },
      {
        "id": "C01.Q3",
        "revision": "2026-11-02.1",
        "routeId": "C01",
        "family": "C",
        "question": "Does an approved compatible known-good comparison retain the same failure?",
        "why": "A one-variable comparison can distinguish path/port from device without arbitrary injectors.",
        "testTemplate": "observation",
        "evidenceToCollect": [
          "Comparator",
          "Compatibility",
          "Same supply",
          "Original path",
          "Restoration"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "C05",
        "noTarget": "P09",
        "unknownTarget": "handover",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "C01",
          "C02",
          "P04"
        ]
      }
    ],
    "closeout": [
      "Avoid arbitrary injectors or supplying power twice.",
      "Keep the incident outcome separate from restoration; retain unresolved evidence and the named next action."
    ]
  },
  {
    "id": "C02",
    "title": "Camera drops at dusk, when IR/heater/PTZ operates",
    "sourceBrief": "Ask whether link loss, camera reboot/uptime or just image change coincides with IR, heater or movement. Log day/night state, model maximum demand vs PSE allocation and total headroom, other simultaneous loads, port event/error counters, cable/run, stream status and recorder gap. Camera reboots and power events coincide → shared power margin/cabling branch P04. Stream stalls while camera stays up → C05/C07. Never diagnose PoE insufficiency from “after dark” alone. Confirm stability during the same demand and verify playback across that time. [REF C01–C02, C04–C05, C07]",
    "systems": [
      "cctv"
    ],
    "sourceRefs": [
      "C01",
      "C02",
      "C04",
      "C05",
      "C07"
    ],
    "summary": "Ask whether link loss, camera reboot/uptime or just image change coincides with IR, heater or movement.",
    "revision": "2026-11-02.1",
    "reviewStatus": "generic-reviewed",
    "provenance": "Adapted from user-supplied FINDR research and implementation brief v1.0; question order is FINDR product design, not a manufacturer procedure.",
    "sourceBriefStatus": "Supplied research text. Model-specific examples require separate verification and are not enabled comparators.",
    "rules": [
      {
        "id": "C02.Q1",
        "revision": "2026-11-02.1",
        "routeId": "C02",
        "family": "C",
        "question": "Does the camera reboot when the symptom occurs?",
        "why": "A reboot differs from an optical night-image change or stream stall.",
        "testTemplate": "display",
        "evidenceToCollect": [
          "Uptime",
          "Port event",
          "Time",
          "IR/heater/PTZ state",
          "Recorder gap"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "C02.Q2",
        "noTarget": "C07",
        "unknownTarget": "C05",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "C01",
          "C02",
          "C04",
          "C05",
          "C07"
        ]
      },
      {
        "id": "C02.Q2",
        "revision": "2026-11-02.1",
        "routeId": "C02",
        "family": "C",
        "question": "Does the power event coincide with the named increase in demand?",
        "why": "After-dark timing alone does not establish PoE insufficiency.",
        "testTemplate": "poe",
        "evidenceToCollect": [
          "Maximum accessory demand",
          "Port allocation",
          "Shared headroom",
          "Simultaneous loads"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "C02.Q3",
        "noTarget": "C05",
        "unknownTarget": "P08",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "C01",
          "C02",
          "C04",
          "C05",
          "C07"
        ]
      },
      {
        "id": "C02.Q3",
        "revision": "2026-11-02.1",
        "routeId": "C02",
        "family": "C",
        "question": "Does the recorded allocation or power margin conflict with the camera's applicable demand?",
        "why": "A documented demand comparison can support a supply/cabling investigation, not mass replacement.",
        "testTemplate": "poe",
        "evidenceToCollect": [
          "Exact camera mode/specification",
          "PSE allocation",
          "Cable/run",
          "Event counters",
          "Same-state retest"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "P04",
        "noTarget": "C05",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "C01",
          "C02",
          "C04",
          "C05",
          "C07"
        ]
      }
    ],
    "closeout": [
      "Confirm stability during the same demand and verify playback across that time.",
      "Keep the incident outcome separate from restoration; retain unresolved evidence and the named next action."
    ]
  },
  {
    "id": "C03",
    "title": "Link up, NVR says offline or network abnormal",
    "sourceBrief": "Ask exact recorder code and whether an authorised client on the correct camera network can reach the device. Log recorder interface incl. private PoE LAN vs building LAN, IP/subnet/VLAN, channel binding, current address source, duplicate-IP evidence, approved discovery result, device identity and time. Wrong subnet/duplicate/mapping → liaise with network owner. Correct identity and reachable but add fails → C04. No response to ping alone is insufficient. ICMP may be blocked. Do not scan unrelated networks or change customer IP addressing without permission. [REF C03–C04]",
    "systems": [
      "cctv"
    ],
    "sourceRefs": [
      "C03",
      "C04"
    ],
    "summary": "Ask exact recorder code and whether an authorised client on the correct camera network can reach the device.",
    "revision": "2026-11-02.1",
    "reviewStatus": "generic-reviewed",
    "provenance": "Adapted from user-supplied FINDR research and implementation brief v1.0; question order is FINDR product design, not a manufacturer procedure.",
    "sourceBriefStatus": "Supplied research text. Model-specific examples require separate verification and are not enabled comparators.",
    "rules": [
      {
        "id": "C03.Q1",
        "revision": "2026-11-02.1",
        "routeId": "C03",
        "family": "C",
        "question": "Is the camera's identity confirmed on the intended authorised network?",
        "why": "Wrong address, private PoE LAN or channel binding can resemble a failed camera.",
        "testTemplate": "network",
        "evidenceToCollect": [
          "Camera ID",
          "Port/channel",
          "Network alias",
          "Address source",
          "VLAN/subnet",
          "Recorder error"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "C03.Q2",
        "noTarget": "manual",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "C03",
          "C04"
        ]
      },
      {
        "id": "C03.Q2",
        "revision": "2026-11-02.1",
        "routeId": "C03",
        "family": "C",
        "question": "Can an authorised client reach the confirmed camera by a supported method?",
        "why": "A failed ping alone does not establish loss of reachability because ICMP may be blocked.",
        "testTemplate": "network",
        "evidenceToCollect": [
          "Approved discovery/reachability",
          "Exact error",
          "Duplicate identity evidence",
          "Network owner"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "C03.Q3",
        "noTarget": "C05",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "C03",
          "C04"
        ]
      },
      {
        "id": "C03.Q3",
        "revision": "2026-11-02.1",
        "routeId": "C03",
        "family": "C",
        "question": "Does the recorder's channel binding point to that confirmed camera?",
        "why": "Correct camera reachability does not prove the recorder uses the right identity.",
        "testTemplate": "display",
        "evidenceToCollect": [
          "Channel binding",
          "Camera identity",
          "Approved configuration reference",
          "No passwords"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "C04",
        "noTarget": "handover",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "C03",
          "C04"
        ]
      }
    ],
    "closeout": [
      "Do not scan unrelated networks or change customer IP addressing without permission.",
      "Keep the incident outcome separate from restoration; retain unresolved evidence and the named next action."
    ]
  },
  {
    "id": "C04",
    "title": "Camera reachable, recorder rejects stream/login",
    "sourceBrief": "Record exact error, time, activation/credential status (no secrets), account permissions/lockout, compatible protocol/profile, stream URL reference without credentials, codec, resolution, main/substream and recorder limits. If local authorised live stream works but recorder authentication is refused, investigate identity, account state or integration compatibility. If substream works but main stream fails, compare codec/profile/bitrate and decode limits. Avoid repeated credential guesses, factory resets or unapproved firmware changes. Confirm both displayed stream and stored playback. [REF C03–C05]",
    "systems": [
      "cctv"
    ],
    "sourceRefs": [
      "C03",
      "C04",
      "C05"
    ],
    "summary": "Record exact error, time, activation/credential status (no secrets), account permissions/lockout, compatible protocol/profile, stream URL reference without credentials, codec, resolution, main/substream and recorder limits.",
    "revision": "2026-11-02.1",
    "reviewStatus": "generic-reviewed",
    "provenance": "Adapted from user-supplied FINDR research and implementation brief v1.0; question order is FINDR product design, not a manufacturer procedure.",
    "sourceBriefStatus": "Supplied research text. Model-specific examples require separate verification and are not enabled comparators.",
    "rules": [
      {
        "id": "C04.Q1",
        "revision": "2026-11-02.1",
        "routeId": "C04",
        "family": "C",
        "question": "Does an authorised local client receive the intended live stream?",
        "why": "Working direct video separates camera output from recorder integration or client limits.",
        "testTemplate": "network",
        "evidenceToCollect": [
          "Exact error",
          "Activation/account state without secrets",
          "Protocol",
          "Camera stream"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "C04.Q2",
        "noTarget": "C03",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "C03",
          "C04",
          "C05"
        ]
      },
      {
        "id": "C04.Q2",
        "revision": "2026-11-02.1",
        "routeId": "C04",
        "family": "C",
        "question": "Does the recorder accept the same authorised identity and stream profile?",
        "why": "An authentication or compatibility error needs its exact recorded meaning.",
        "testTemplate": "display",
        "evidenceToCollect": [
          "Account role",
          "Lockout state",
          "Profile/codec",
          "Recorder limits",
          "No credentials"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "C04.Q3",
        "noTarget": "manual",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "C03",
          "C04",
          "C05"
        ]
      },
      {
        "id": "C04.Q3",
        "revision": "2026-11-02.1",
        "routeId": "C04",
        "family": "C",
        "question": "Does the substream work while the main stream fails?",
        "why": "A profile-specific result can separate bitrate/codec/decode limits from complete connectivity loss.",
        "testTemplate": "network",
        "evidenceToCollect": [
          "Main/substream settings",
          "Same client",
          "Bitrate/resolution",
          "Stored playback verification"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "C05",
        "noTarget": "C08",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "C03",
          "C04",
          "C05"
        ]
      }
    ],
    "closeout": [
      "Confirm both displayed stream and stored playback.",
      "Keep the incident outcome separate from restoration; retain unresolved evidence and the named next action."
    ]
  },
  {
    "id": "C05",
    "title": "Several feeds freeze / cameras flap on one switch or bridge",
    "sourceBrief": "Group by switch, uplink, power domain, NVR and time. Log negotiated link, error/discard counters over an interval, uplink traffic, stream bitrates, recorder utilisation and effect at a local camera view. One branch fails together → inspect shared uplink/switch/PoE. All local camera views work but recorder feeds freeze → recorder bandwidth/storage/client decode. For a wireless bridge, record power/link at both ends and approved radio metrics/obstruction. Refer network changes to IT. Successful pings are insufficient evidence of stable video throughput. [REF C01–C02, C04–C05]",
    "systems": [
      "cctv"
    ],
    "sourceRefs": [
      "C01",
      "C02",
      "C04",
      "C05"
    ],
    "summary": "Group by switch, uplink, power domain, NVR and time.",
    "revision": "2026-11-02.1",
    "reviewStatus": "generic-reviewed",
    "provenance": "Adapted from user-supplied FINDR research and implementation brief v1.0; question order is FINDR product design, not a manufacturer procedure.",
    "sourceBriefStatus": "Supplied research text. Model-specific examples require separate verification and are not enabled comparators.",
    "rules": [
      {
        "id": "C05.Q1",
        "revision": "2026-11-02.1",
        "routeId": "C05",
        "family": "C",
        "question": "Do the failed cameras share a confirmed switch, bridge or uplink?",
        "why": "Shared dependencies are stronger first boundaries than simultaneous independent camera failures.",
        "testTemplate": "observation",
        "evidenceToCollect": [
          "Physical path",
          "Shared power domain",
          "Camera IDs",
          "Matched clocks"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "C05.Q2",
        "noTarget": "C04",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "C01",
          "C02",
          "C04",
          "C05"
        ]
      },
      {
        "id": "C05.Q2",
        "revision": "2026-11-02.1",
        "routeId": "C05",
        "family": "C",
        "question": "Do direct local camera views remain stable during the recorder failure?",
        "why": "Stable local views separate the camera branch from recorder/uplink/client problems.",
        "testTemplate": "network",
        "evidenceToCollect": [
          "Local camera view",
          "Recorder view",
          "Same interval",
          "Link/discard counters"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "C05.Q3",
        "noTarget": "C02",
        "unknownTarget": "P08",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "C01",
          "C02",
          "C04",
          "C05"
        ]
      },
      {
        "id": "C05.Q3",
        "revision": "2026-11-02.1",
        "routeId": "C05",
        "family": "C",
        "question": "Do the common-path counters change during that same failure interval?",
        "why": "An interval comparison is more useful than a single link-up or ping result.",
        "testTemplate": "network",
        "evidenceToCollect": [
          "Uplink traffic",
          "Error/discard delta",
          "Bitrates",
          "Recorder utilisation",
          "Bridge endpoint status"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "handover",
        "noTarget": "C09",
        "unknownTarget": "P08",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "C01",
          "C02",
          "C04",
          "C05"
        ]
      }
    ],
    "closeout": [
      "Successful pings are insufficient evidence of stable video throughput.",
      "Keep the incident outcome separate from restoration; retain unresolved evidence and the named next action."
    ]
  },
  {
    "id": "C06",
    "title": "Analogue/coax camera blank, incompatible or distorted",
    "sourceBrief": "Ask DVR input type and actual camera format (TVI/AHD/CVI/CVBS as applicable), supported resolution, channel mapping, camera power, BNC/balun/converter and PoC (power over coax) status. Log local compatible test monitor/known-good short run and recorder input comparison where authorised. With all supplies including PoC removed and both ends disconnected, test centre continuity end-to-end, shield continuity end-to-end, and centre-to-shield with far end open. OL on centre-to-shield in that setup is expected. OL end-to-end on the same conductor supports a break. A terminator/device changes the measurement. TDR distance is a cable-length estimate affected by cable settings, not a map coordinate. [REF C06, P03, P05]",
    "systems": [
      "cctv"
    ],
    "sourceRefs": [
      "C06",
      "P03",
      "P05"
    ],
    "summary": "Ask DVR input type and actual camera format (TVI/AHD/CVI/CVBS as applicable), supported resolution, channel mapping, camera power, BNC/balun/converter and PoC (power over coax) status.",
    "revision": "2026-11-02.1",
    "reviewStatus": "generic-reviewed",
    "provenance": "Adapted from user-supplied FINDR research and implementation brief v1.0; question order is FINDR product design, not a manufacturer procedure.",
    "sourceBriefStatus": "Supplied research text. Model-specific examples require separate verification and are not enabled comparators.",
    "rules": [
      {
        "id": "C06.Q1",
        "revision": "2026-11-02.1",
        "routeId": "C06",
        "family": "C",
        "question": "Is the camera's actual video format compatible with the recorder input?",
        "why": "TVI/AHD/CVI/CVBS and resolution differences can produce a blank image without a cable break.",
        "testTemplate": "observation",
        "evidenceToCollect": [
          "Actual format",
          "DVR input",
          "Resolution",
          "Channel",
          "Power and PoC status"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "C06.Q2",
        "noTarget": "manual",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "C06",
          "P03",
          "P05"
        ]
      },
      {
        "id": "C06.Q2",
        "revision": "2026-11-02.1",
        "routeId": "C06",
        "family": "C",
        "question": "Does an approved local compatible monitor receive video at the camera?",
        "why": "A local comparison distinguishes camera output from the run or recorder input.",
        "testTemplate": "observation",
        "evidenceToCollect": [
          "Compatible monitor",
          "Known-good short run",
          "Camera power",
          "One variable changed"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "C06.Q3",
        "noTarget": "P03",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "C06",
          "P03",
          "P05"
        ]
      },
      {
        "id": "C06.Q3",
        "revision": "2026-11-02.1",
        "routeId": "C06",
        "family": "C",
        "question": "Is the entire proposed coax test span isolated from every supply including PoC?",
        "why": "Unknown PoC or attached equipment prevents a valid bare-span resistance interpretation.",
        "testTemplate": "observation",
        "evidenceToCollect": [
          "Both disconnected ends",
          "PoC",
          "Converters",
          "Terminator/device disposition"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "C06.Q4",
        "noTarget": "manual",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "C06",
          "P03",
          "P05"
        ]
      },
      {
        "id": "C06.Q4",
        "revision": "2026-11-02.1",
        "routeId": "C06",
        "family": "C",
        "question": "Does the same conductor have end-to-end continuity on that verified span?",
        "why": "End-to-end OL can support a discontinuity; centre-to-shield OL with the far end open is a different and expected result.",
        "testTemplate": "continuity",
        "evidenceToCollect": [
          "Centre end-to-end",
          "Shield end-to-end",
          "Centre-to-shield separately",
          "Far end open",
          "Lead compensation"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "isolation",
          "bothEnds",
          "bareSpan",
          "instrument"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "handover",
        "noTarget": "P06",
        "unknownTarget": "handover",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T1",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "C06",
          "P03",
          "P05"
        ]
      }
    ],
    "closeout": [
      "TDR distance is a cable-length estimate affected by cable settings, not a map coordinate.",
      "Keep the incident outcome separate from restoration; retain unresolved evidence and the named next action."
    ]
  },
  {
    "id": "C07",
    "title": "Live image poor, focus lost or washed out",
    "sourceBrief": "Ask day/night, live vs recorded, one or all cameras and whether the scene is static or moving. Log focus point, condition of dome/film, water/condensation, nearby IR-reflective surface, backlight, lighting, exposure/shutter, compression and motion blur. Good daytime image with night haze → check IR reflections/dome/scene before network settings. Sharp static image with blurred moving subjects → inspect lighting and exposure trade-off. Good direct image but poor recorder/client → compare stream profile/display and export. Save privacy-minimised comparison images only if authorised. [REF C07, C04–C05, S10]",
    "systems": [
      "cctv"
    ],
    "sourceRefs": [
      "C07",
      "C04",
      "C05",
      "S10"
    ],
    "summary": "Ask day/night, live vs recorded, one or all cameras and whether the scene is static or moving.",
    "revision": "2026-11-02.1",
    "reviewStatus": "generic-reviewed",
    "provenance": "Adapted from user-supplied FINDR research and implementation brief v1.0; question order is FINDR product design, not a manufacturer procedure.",
    "sourceBriefStatus": "Supplied research text. Model-specific examples require separate verification and are not enabled comparators.",
    "rules": [
      {
        "id": "C07.Q1",
        "revision": "2026-11-02.1",
        "routeId": "C07",
        "family": "C",
        "question": "Is the poor image confined to night conditions without a recorded camera restart?",
        "why": "Night haze and optical reflection need a different route from reboot or power loss.",
        "testTemplate": "observation",
        "evidenceToCollect": [
          "Day/night comparison",
          "Camera uptime",
          "Lighting",
          "Original versus exported image"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "C07.Q2",
        "noTarget": "C02",
        "unknownTarget": "P08",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "C07",
          "C04",
          "C05",
          "S10"
        ]
      },
      {
        "id": "C07.Q2",
        "revision": "2026-11-02.1",
        "routeId": "C07",
        "family": "C",
        "question": "Is the defect present in the direct camera image?",
        "why": "A good direct image with a poor recorder/client view points towards stream or display differences.",
        "testTemplate": "observation",
        "evidenceToCollect": [
          "Direct/recorded views",
          "Dome/film",
          "Water",
          "IR-reflective surfaces",
          "Focus"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "C07.Q3",
        "noTarget": "C04",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "C07",
          "C04",
          "C05",
          "S10"
        ]
      },
      {
        "id": "C07.Q3",
        "revision": "2026-11-02.1",
        "routeId": "C07",
        "family": "C",
        "question": "Is a static subject sharp while movement is blurred?",
        "why": "Motion-specific blur directs attention to lighting and exposure trade-offs rather than a general network diagnosis.",
        "testTemplate": "observation",
        "evidenceToCollect": [
          "Static/moving comparison",
          "Exposure/shutter",
          "Scene lighting",
          "Authorised privacy-minimised sample"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "manual",
        "noTarget": "handover",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "C07",
          "C04",
          "C05",
          "S10"
        ]
      }
    ],
    "closeout": [
      "Save privacy-minimised comparison images only if authorised.",
      "Keep the incident outcome separate from restoration; retain unresolved evidence and the named next action."
    ]
  },
  {
    "id": "C08",
    "title": "Live view works, no recording at requested time",
    "sourceBrief": "Ask exact camera/channel, recorder clock/timezone/DST, time searched, role/permission, continuous vs event schedule and recording destination. Log last successful clip, disk status, retention/overwrite policy, schedule/trigger, stream assigned and whether a new authorised test event is captured. Other cameras record on same storage → examine channel schedule/event mapping. All fail → storage/service/time. Recent playback works but older interval absent → retention, gaps or wrong clock. Do not format/initialise a disk as a diagnostic. Verify a new recording by actual playback and export if required, including timestamp. [REF C05, S10]",
    "systems": [
      "cctv"
    ],
    "sourceRefs": [
      "C05",
      "S10"
    ],
    "summary": "Ask exact camera/channel, recorder clock/timezone/DST, time searched, role/permission, continuous vs event schedule and recording destination.",
    "revision": "2026-11-02.1",
    "reviewStatus": "generic-reviewed",
    "provenance": "Adapted from user-supplied FINDR research and implementation brief v1.0; question order is FINDR product design, not a manufacturer procedure.",
    "sourceBriefStatus": "Supplied research text. Model-specific examples require separate verification and are not enabled comparators.",
    "rules": [
      {
        "id": "C08.Q1",
        "revision": "2026-11-02.1",
        "routeId": "C08",
        "family": "C",
        "question": "Do the requested search time and the recorder's actual time refer to the same instant?",
        "why": "Clock, timezone and DST differences can hide existing clips without proving recording failure.",
        "testTemplate": "display",
        "evidenceToCollect": [
          "Camera/channel",
          "Phone/recorder time",
          "Timezone",
          "Clock offset",
          "Original search window"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "C08.Q2",
        "noTarget": "C08.Q3",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "C05",
          "S10"
        ]
      },
      {
        "id": "C08.Q2",
        "revision": "2026-11-02.1",
        "routeId": "C08",
        "family": "C",
        "question": "Does a new authorised test event produce a playable clip on this channel?",
        "why": "A green recording icon or live image cannot prove stored footage.",
        "testTemplate": "playback",
        "evidenceToCollect": [
          "Test event time",
          "Clip search",
          "Actual playback",
          "Storage destination",
          "Permission"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "handover",
        "noTarget": "C08.Q3",
        "unknownTarget": "handover",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "C05",
          "S10"
        ]
      },
      {
        "id": "C08.Q3",
        "revision": "2026-11-02.1",
        "routeId": "C08",
        "family": "C",
        "question": "Do other channels record successfully to the same storage now?",
        "why": "A single-channel failure differs from a shared recording service or disk path.",
        "testTemplate": "display",
        "evidenceToCollect": [
          "Schedule/trigger",
          "Assigned stream",
          "Disk status",
          "Last clip",
          "Preservation request"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "manual",
        "noTarget": "C09",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "C05",
          "S10"
        ]
      }
    ],
    "closeout": [
      "Verify a new recording by actual playback and export if required, including timestamp.",
      "Keep the incident outcome separate from restoration; retain unresolved evidence and the named next action."
    ]
  },
  {
    "id": "C09",
    "title": "Missing clips, intermittent recording or retention shorter than expected",
    "sourceBrief": "Log exact missing intervals, clock jumps, disconnect and storage errors, camera-side continuity where supported, aggregate bitrate/throughput, disk health/utilisation and actual retention vs agreed objective. Gaps aligned with link drops → C05. Continuous live stream with storage alarms or all-channel gaps → recording path/service. Full storage can invoke configured retention/overwrite. Distinguish expected deletion from failure. Protect existing footage, record preservation request and consult authorised owner before disruptive action. [REF C04–C05, S10]",
    "systems": [
      "cctv"
    ],
    "sourceRefs": [
      "C04",
      "C05",
      "S10"
    ],
    "summary": "Log exact missing intervals, clock jumps, disconnect and storage errors, camera-side continuity where supported, aggregate bitrate/throughput, disk health/utilisation and actual retention vs agreed objective.",
    "revision": "2026-11-02.1",
    "reviewStatus": "generic-reviewed",
    "provenance": "Adapted from user-supplied FINDR research and implementation brief v1.0; question order is FINDR product design, not a manufacturer procedure.",
    "sourceBriefStatus": "Supplied research text. Model-specific examples require separate verification and are not enabled comparators.",
    "rules": [
      {
        "id": "C09.Q1",
        "revision": "2026-11-02.1",
        "routeId": "C09",
        "family": "C",
        "question": "Do the missing intervals coincide with camera link losses?",
        "why": "Timing can distinguish capture-path gaps from storage/service or retention behaviour.",
        "testTemplate": "display",
        "evidenceToCollect": [
          "Exact gaps",
          "Camera continuity",
          "Disconnect times",
          "Clock jumps"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "C05",
        "noTarget": "C09.Q2",
        "unknownTarget": "P08",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "C04",
          "C05",
          "S10"
        ]
      },
      {
        "id": "C09.Q2",
        "revision": "2026-11-02.1",
        "routeId": "C09",
        "family": "C",
        "question": "Do multiple channels show gaps during the same storage event?",
        "why": "Shared storage errors give a broader failure boundary than one camera's schedule.",
        "testTemplate": "display",
        "evidenceToCollect": [
          "Storage error",
          "Affected channels",
          "Bitrate/throughput",
          "Disk utilisation"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "C09.Q3",
        "noTarget": "C08",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "C04",
          "C05",
          "S10"
        ]
      },
      {
        "id": "C09.Q3",
        "revision": "2026-11-02.1",
        "routeId": "C09",
        "family": "C",
        "question": "Does the observed deletion agree with the approved retention policy?",
        "why": "Configured overwrite is distinct from unexplained missing recordings; existing footage must be preserved.",
        "testTemplate": "observation",
        "evidenceToCollect": [
          "Retention objective",
          "Overwrite policy",
          "Actual earliest clip",
          "Preservation owner",
          "No formatting"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "handover",
        "noTarget": "manual",
        "unknownTarget": "handover",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "C04",
          "C05",
          "S10"
        ]
      }
    ],
    "closeout": [
      "Protect existing footage, record preservation request and consult authorised owner before disruptive action.",
      "Keep the incident outcome separate from restoration; retain unresolved evidence and the named next action."
    ]
  },
  {
    "id": "C10",
    "title": "PTZ picture good but control fails, or PTZ resets",
    "sourceBrief": "Ask whether power/stream remains stable during movement. Log actual controllable channel, operator permission/control priority, supported IP control or separate analogue telemetry, protocol/address/baud if applicable, preset vs manual movement, obstruction and reboot events. Stable camera with no control → control mapping/permissions/telemetry. Reboot under movement → C02. Jog works but preset wrong → preset mapping/limits. Capture original settings. Use the PTZ’s own manual, safe access and approved movement envelope. [REF C01, C09, C04]",
    "systems": [
      "cctv"
    ],
    "sourceRefs": [
      "C01",
      "C09",
      "C04"
    ],
    "summary": "Ask whether power/stream remains stable during movement.",
    "revision": "2026-11-02.1",
    "reviewStatus": "generic-reviewed",
    "provenance": "Adapted from user-supplied FINDR research and implementation brief v1.0; question order is FINDR product design, not a manufacturer procedure.",
    "sourceBriefStatus": "Supplied research text. Model-specific examples require separate verification and are not enabled comparators.",
    "rules": [
      {
        "id": "C10.Q1",
        "revision": "2026-11-02.1",
        "routeId": "C10",
        "family": "C",
        "question": "Does the camera reboot when movement is requested?",
        "why": "Loss of power during movement differs from a stable camera rejecting control.",
        "testTemplate": "display",
        "evidenceToCollect": [
          "Uptime",
          "Movement command",
          "Stream continuity",
          "Power event",
          "Time"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "C02",
        "noTarget": "C10.Q2",
        "unknownTarget": "P08",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "C01",
          "C09",
          "C04"
        ]
      },
      {
        "id": "C10.Q2",
        "revision": "2026-11-02.1",
        "routeId": "C10",
        "family": "C",
        "question": "Does authorised manual movement work on the intended camera?",
        "why": "Working jog with a failed preset narrows to mapping or limits rather than total telemetry failure.",
        "testTemplate": "functional",
        "evidenceToCollect": [
          "Controllable channel",
          "Operator role/priority",
          "Telemetry method",
          "Movement envelope"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "impairment"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "C10.Q3",
        "noTarget": "manual",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T1",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "C01",
          "C09",
          "C04"
        ]
      },
      {
        "id": "C10.Q3",
        "revision": "2026-11-02.1",
        "routeId": "C10",
        "family": "C",
        "question": "Does the intended preset point to the required recorded position?",
        "why": "A mapping issue requires approved settings review, not a new power diagnosis.",
        "testTemplate": "display",
        "evidenceToCollect": [
          "Preset identity",
          "Original setting",
          "Limits",
          "Actual position",
          "Restore record"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "handover",
        "noTarget": "manual",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "C01",
          "C09",
          "C04"
        ]
      }
    ],
    "closeout": [
      "Use the PTZ’s own manual, safe access and approved movement envelope.",
      "Keep the incident outcome separate from restoration; retain unresolved evidence and the named next action."
    ]
  },
  {
    "id": "C11",
    "title": "Local viewing works, remote/mobile client fails",
    "sourceBrief": "Log which clients are affected, local NVR playback proof, service state, DNS/time/certificate/account/role, authorised remote connection method, site IT contact and whether another authorised client works. One user → account/client/role. All remote users with local recording healthy → remote path/service or policy. Do not suggest port forwarding, disabling firewall controls or exposing a recorder to the internet as automatic fixes. Record “local recording verified / remote access unavailable” separately. [REF C04–C05, S10]",
    "systems": [
      "cctv"
    ],
    "sourceRefs": [
      "C04",
      "C05",
      "S10"
    ],
    "summary": "Log which clients are affected, local NVR playback proof, service state, DNS/time/certificate/account/role, authorised remote connection method, site IT contact and whether another authorised client works.",
    "revision": "2026-11-02.1",
    "reviewStatus": "generic-reviewed",
    "provenance": "Adapted from user-supplied FINDR research and implementation brief v1.0; question order is FINDR product design, not a manufacturer procedure.",
    "sourceBriefStatus": "Supplied research text. Model-specific examples require separate verification and are not enabled comparators.",
    "rules": [
      {
        "id": "C11.Q1",
        "revision": "2026-11-02.1",
        "routeId": "C11",
        "family": "C",
        "question": "Is local recording verified by actual playback?",
        "why": "Remote access loss and local recording failure must remain separate outcomes.",
        "testTemplate": "playback",
        "evidenceToCollect": [
          "Known-time clip",
          "Local playback",
          "Recorder identity",
          "User role"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "C11.Q2",
        "noTarget": "C08",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "C04",
          "C05",
          "S10"
        ]
      },
      {
        "id": "C11.Q2",
        "revision": "2026-11-02.1",
        "routeId": "C11",
        "family": "C",
        "question": "Is the remote failure confined to one authorised client or user?",
        "why": "A single client/role problem differs from loss of the shared remote service or policy path.",
        "testTemplate": "observation",
        "evidenceToCollect": [
          "Affected clients",
          "Local proof",
          "Role",
          "Approved remote method",
          "Exact error"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "manual",
        "noTarget": "C11.Q3",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "C04",
          "C05",
          "S10"
        ]
      },
      {
        "id": "C11.Q3",
        "revision": "2026-11-02.1",
        "routeId": "C11",
        "family": "C",
        "question": "Is the authorised remote service currently available according to its owner?",
        "why": "Remote-path evidence belongs with the network/service owner, not automatic firewall changes.",
        "testTemplate": "display",
        "evidenceToCollect": [
          "DNS/time/certificate state",
          "Service status",
          "IT owner",
          "Remaining remote limitation"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "handover",
        "noTarget": "handover",
        "unknownTarget": "handover",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "C04",
          "C05",
          "S10"
        ]
      }
    ],
    "closeout": [
      "Record “local recording verified / remote access unavailable” separately.",
      "Keep the incident outcome separate from restoration; retain unresolved evidence and the named next action."
    ]
  },
  {
    "id": "C12",
    "title": "ANPR camera online but missed reads or wrong events",
    "sourceBrief": "Ask whether plates are legible in an authorised original frame, whether the analytic produced a read, and whether that result reached its destination. Log capture position, vehicle direction/speed, lighting, plate size/blur/angle per model guide, analytic region/schedule and event delivery. Unreadable frame → optical/capture branch C07. Legible frame with no local result → analytic settings/model. Local result with no barrier/recorder event → downstream integration. Use a consented test target or mask identifiers in the export. [REF C08, C07, S10]",
    "systems": [
      "cctv"
    ],
    "sourceRefs": [
      "C08",
      "C07",
      "S10"
    ],
    "summary": "Ask whether plates are legible in an authorised original frame, whether the analytic produced a read, and whether that result reached its destination.",
    "revision": "2026-11-02.1",
    "reviewStatus": "generic-reviewed",
    "provenance": "Adapted from user-supplied FINDR research and implementation brief v1.0; question order is FINDR product design, not a manufacturer procedure.",
    "sourceBriefStatus": "Supplied research text. Model-specific examples require separate verification and are not enabled comparators.",
    "rules": [
      {
        "id": "C12.Q1",
        "revision": "2026-11-02.1",
        "routeId": "C12",
        "family": "C",
        "question": "Is the target plate legible in an authorised original frame?",
        "why": "An unreadable frame is a capture issue before it is an analytics or delivery issue.",
        "testTemplate": "observation",
        "evidenceToCollect": [
          "Capture conditions",
          "Target alias",
          "Position/angle",
          "Lighting/blur",
          "No unnecessary identifiers"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "C12.Q2",
        "noTarget": "C07",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "C08",
          "C07",
          "S10"
        ]
      },
      {
        "id": "C12.Q2",
        "revision": "2026-11-02.1",
        "routeId": "C12",
        "family": "C",
        "question": "Did the camera's analytic produce a local read for that same target event?",
        "why": "A legible image without a local result differs from a read lost downstream.",
        "testTemplate": "display",
        "evidenceToCollect": [
          "Local analytic result",
          "Region/schedule",
          "Time",
          "Model applicability"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "C12.Q3",
        "noTarget": "manual",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "C08",
          "C07",
          "S10"
        ]
      },
      {
        "id": "C12.Q3",
        "revision": "2026-11-02.1",
        "routeId": "C12",
        "family": "C",
        "question": "Did the expected destination receive that local result?",
        "why": "Event delivery is a separate function from image capture and local recognition.",
        "testTemplate": "observation",
        "evidenceToCollect": [
          "Destination",
          "Event receipt",
          "Barrier/recorder outcome",
          "Privacy-minimised reference"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "handover",
        "noTarget": "handover",
        "unknownTarget": "handover",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "C08",
          "C07",
          "S10"
        ]
      }
    ],
    "closeout": [
      "Use a consented test target or mask identifiers in the export.",
      "Keep the incident outcome separate from restoration; retain unresolved evidence and the named next action."
    ]
  },
  {
    "id": "I01",
    "title": "Zone high resistance, open, short or tamper",
    "sourceBrief": "Ask whether the value was reported by panel diagnostics or measured on a truly isolated field pair. Log point, detector contact state, enclosure state, EOL layout, active zone profile, which ends are lifted, passive items still connected, range and reading with units. High resistance/OL is not evidence of a low-resistance conductor short. One end lifted with an expander/EOL still connected cannot prove a bare cable faulty. If panel values move appropriately between secure/alarm but the display still faults, check active profile, tamper/mask and event history. If field evidence is incomplete, identify the missing endpoint and arrange access. [REF I01–I03, P03]",
    "systems": [
      "intruder"
    ],
    "sourceRefs": [
      "I01",
      "I02",
      "I03",
      "P03"
    ],
    "summary": "Ask whether the value was reported by panel diagnostics or measured on a truly isolated field pair.",
    "revision": "2026-11-02.1",
    "reviewStatus": "generic-reviewed",
    "provenance": "Adapted from user-supplied FINDR research and implementation brief v1.0; question order is FINDR product design, not a manufacturer procedure.",
    "sourceBriefStatus": "Supplied research text. Model-specific examples require separate verification and are not enabled comparators.",
    "rules": [
      {
        "id": "I01.Q1",
        "revision": "2026-11-02.1",
        "routeId": "I01",
        "family": "I",
        "question": "Is the field span confirmed isolated from all sources for this proposed resistance test?",
        "why": "Unknown energy state blocks a resistance prompt; a prior typed value remains historical evidence.",
        "testTemplate": "observation",
        "evidenceToCollect": [
          "Source inventory",
          "Isolation record",
          "Battery/remote supply",
          "Historical versus current result"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "I01.Q2",
        "noTarget": "I01.Q4",
        "unknownTarget": "I01.Q4",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "I01",
          "I02",
          "I03",
          "P03"
        ]
      },
      {
        "id": "I01.Q2",
        "revision": "2026-11-02.1",
        "routeId": "I01",
        "family": "I",
        "question": "Are both physical ends of the test span identified?",
        "why": "One lifted local end cannot prove a bare cable's condition while the remote end remains unknown.",
        "testTemplate": "observation",
        "evidenceToCollect": [
          "Input/RIO identity",
          "Both endpoints",
          "Far-end access",
          "Attached EOL/electronics"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "I01.Q3",
        "noTarget": "handover",
        "unknownTarget": "handover",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "I01",
          "I02",
          "I03",
          "P03"
        ]
      },
      {
        "id": "I01.Q3",
        "revision": "2026-11-02.1",
        "routeId": "I01",
        "family": "I",
        "question": "Is the intended resistance test matched to the actual programmed input profile?",
        "why": "A network's secure/alarm totals differ from a bare-conductor test and are model/mode-specific.",
        "testTemplate": "resistance",
        "evidenceToCollect": [
          "Wiring mode",
          "Connected components",
          "Probe pair",
          "State",
          "Profile source",
          "Raw Ω/kΩ value"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "isolation",
          "bothEnds",
          "instrument"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "I02",
        "noTarget": "manual",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T1",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "I01",
          "I02",
          "I03",
          "P03"
        ]
      },
      {
        "id": "I01.Q4",
        "revision": "2026-11-02.1",
        "routeId": "I01",
        "family": "I",
        "question": "Does a supported panel diagnostic show the zone changing with the observed contact state?",
        "why": "Read-only panel evidence can remain useful when field resistance testing is unavailable.",
        "testTemplate": "display",
        "evidenceToCollect": [
          "Panel-reported versus meter value",
          "Zone display",
          "Contact state",
          "Event history",
          "Access needed"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "I02",
        "noTarget": "I03",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "I01",
          "I02",
          "I03",
          "P03"
        ]
      }
    ],
    "closeout": [
      "If field evidence is incomplete, identify the missing endpoint and arrange access.",
      "Keep the incident outcome separate from restoration; retain unresolved evidence and the named next action."
    ]
  },
  {
    "id": "I02",
    "title": "Door contact transitions but panel reports unexpected state",
    "sourceBrief": "Log contact type, magnet position/gap, door closed/opened slowly, zone resistance or state in each position, separate tamper or intermediate door alarm/relay and whether this is an instantaneous or latched indication. On verified Galaxy Dimension 1 kΩ double-balanced wiring, approximately 1 kΩ closed and 2 kΩ active can be expected in the applicable table. Other profiles differ. Example readings 996 Ω and 1967 Ω become interpretable only after identifying the exact programmed profile, zone override and where the measurement came from. Failure to change at the contact → alignment/contact diagnosis. Local change but no change at RIO → investigate intermediate wiring or relay. [REF I02, P03]",
    "systems": [
      "intruder"
    ],
    "sourceRefs": [
      "I02",
      "P03"
    ],
    "summary": "Log contact type, magnet position/gap, door closed/opened slowly, zone resistance or state in each position, separate tamper or intermediate door alarm/relay and whether this is an instantaneous or latched indication.",
    "revision": "2026-11-02.1",
    "reviewStatus": "generic-reviewed",
    "provenance": "Adapted from user-supplied FINDR research and implementation brief v1.0; question order is FINDR product design, not a manufacturer procedure.",
    "sourceBriefStatus": "Supplied research text. Model-specific examples require separate verification and are not enabled comparators.",
    "rules": [
      {
        "id": "I02.Q1",
        "revision": "2026-11-02.1",
        "routeId": "I02",
        "family": "I",
        "question": "Is the actual programmed wiring profile known for this input?",
        "why": "Similar measured values cannot identify a Galaxy, Texecom or other input mode.",
        "testTemplate": "display",
        "evidenceToCollect": [
          "Panel/input hardware",
          "Profile",
          "Zone override",
          "Source revision"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "I02.Q2",
        "noTarget": "manual",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "I02",
          "P03"
        ]
      },
      {
        "id": "I02.Q2",
        "revision": "2026-11-02.1",
        "routeId": "I02",
        "family": "I",
        "question": "Does the local contact state change when the door moves?",
        "why": "No local transition directs attention to alignment or contact before intermediate wiring.",
        "testTemplate": "contact",
        "evidenceToCollect": [
          "Contact type",
          "Magnet gap",
          "Door position",
          "Separate tamper",
          "Test method"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "impairment"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "I02.Q3",
        "noTarget": "handover",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T1",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "I02",
          "P03"
        ]
      },
      {
        "id": "I02.Q3",
        "revision": "2026-11-02.1",
        "routeId": "I02",
        "family": "I",
        "question": "Does the panel input follow that same local transition?",
        "why": "A local change with no input change keeps the intermediate relay, cable or input path in scope.",
        "testTemplate": "display",
        "evidenceToCollect": [
          "Secure/active raw values",
          "Panel states",
          "Same transition time",
          "Intermediate door alarm",
          "Latched versus instantaneous event"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "P08",
        "noTarget": "P06",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "I02",
          "P03"
        ]
      }
    ],
    "closeout": [
      "Local change but no change at RIO → investigate intermediate wiring or relay.",
      "Keep the incident outcome separate from restoration; retain unresolved evidence and the named next action."
    ]
  },
  {
    "id": "I03",
    "title": "PIR/dual-tech has power but no zone activation",
    "sourceBrief": "Log sensor +/− at device during walk test, settling/walk-test mode, PIR and microwave indications where supported, logic mode/range, actual relay/contact change, tamper state, zone display, partition/area and physical test movement. Sensor indicates detection but panel zone does not change → trace relay wiring/EOL/input. Sensor never indicates and supply meets its own specification → inspect test conditions, optics, coverage/setup and sensor. A disabled walk-test LED is not proof of a dead sensor. Verify the intended zone at the keypad as well as local response. [REF I01–I03]",
    "systems": [
      "intruder"
    ],
    "sourceRefs": [
      "I01",
      "I02",
      "I03"
    ],
    "summary": "Log sensor +/− at device during walk test, settling/walk-test mode, PIR and microwave indications where supported, logic mode/range, actual relay/contact change, tamper state, zone display, partition/area and physical test movement.",
    "revision": "2026-11-02.1",
    "reviewStatus": "generic-reviewed",
    "provenance": "Adapted from user-supplied FINDR research and implementation brief v1.0; question order is FINDR product design, not a manufacturer procedure.",
    "sourceBriefStatus": "Supplied research text. Model-specific examples require separate verification and are not enabled comparators.",
    "rules": [
      {
        "id": "I03.Q1",
        "revision": "2026-11-02.1",
        "routeId": "I03",
        "family": "I",
        "question": "Does the detector indicate the intended local detection during the approved walk test?",
        "why": "A disabled LED is not proof of a dead detector; mode and actual response matter.",
        "testTemplate": "functional",
        "evidenceToCollect": [
          "Detector model",
          "Settling/test mode",
          "PIR/microwave indications",
          "Physical movement"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "impairment"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "I03.Q2",
        "noTarget": "I03.Q3",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T1",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "I01",
          "I02",
          "I03"
        ]
      },
      {
        "id": "I03.Q2",
        "revision": "2026-11-02.1",
        "routeId": "I03",
        "family": "I",
        "question": "Does the corresponding zone change at the keypad during that local detection?",
        "why": "The device-to-input boundary must be verified separately from local detection.",
        "testTemplate": "display",
        "evidenceToCollect": [
          "Relay/contact observation",
          "Keypad zone",
          "EOL/input identity",
          "Same test time"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "handover",
        "noTarget": "I01",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "I01",
          "I02",
          "I03"
        ]
      },
      {
        "id": "I03.Q3",
        "revision": "2026-11-02.1",
        "routeId": "I03",
        "family": "I",
        "question": "Does the detector supply meet its applicable reference during the test condition?",
        "why": "Correct supply shifts attention to detector conditions or setup without proving a component failed.",
        "testTemplate": "voltage",
        "evidenceToCollect": [
          "Device +/−",
          "Actual state",
          "Required reference",
          "Optics/coverage",
          "Supported logic mode"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "energised",
          "instrument"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "manual",
        "noTarget": "P03",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T1",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "I01",
          "I02",
          "I03"
        ]
      }
    ],
    "closeout": [
      "Verify the intended zone at the keypad as well as local response.",
      "Keep the incident outcome separate from restoration; retain unresolved evidence and the named next action."
    ]
  },
  {
    "id": "I04",
    "title": "Replacement DT causes persistent tamper or mask",
    "sourceBrief": "Identify old and new model terminal legends, onboard resistors/jumpers, external resistors still fitted, whether tamper is separate or combined, and program at the actual input. Log secure/alarm/lid-open and mask/fault states only where supported. Compare panel labels with matching diagrams. Two sets of resistors or using an EOL terminal as if it were an independent tamper contact can change the encoded states. Capture marked-up terminal names, never infer function from yellow/blue cores or brand alone. Unknown replacement diagram → request that device manual and log a return. Restore and prove both alarm and tamper. [REF I01–I03]",
    "systems": [
      "intruder"
    ],
    "sourceRefs": [
      "I01",
      "I02",
      "I03"
    ],
    "summary": "Identify old and new model terminal legends, onboard resistors/jumpers, external resistors still fitted, whether tamper is separate or combined, and program at the actual input.",
    "revision": "2026-11-02.1",
    "reviewStatus": "generic-reviewed",
    "provenance": "Adapted from user-supplied FINDR research and implementation brief v1.0; question order is FINDR product design, not a manufacturer procedure.",
    "sourceBriefStatus": "Supplied research text. Model-specific examples require separate verification and are not enabled comparators.",
    "rules": [
      {
        "id": "I04.Q1",
        "revision": "2026-11-02.1",
        "routeId": "I04",
        "family": "I",
        "question": "Are the replacement device's terminal functions identified from its own diagram?",
        "why": "Cable colour or brand does not establish alarm, tamper, mask or EOL function.",
        "testTemplate": "observation",
        "evidenceToCollect": [
          "Old/new models",
          "Terminal legends",
          "Manual locator",
          "Photograph reference"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "I04.Q2",
        "noTarget": "manual",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "I01",
          "I02",
          "I03"
        ]
      },
      {
        "id": "I04.Q2",
        "revision": "2026-11-02.1",
        "routeId": "I04",
        "family": "I",
        "question": "Are external resistors still present where the new device has onboard resistors selected?",
        "why": "Two resistor networks can change encoded states without indicating a cable short.",
        "testTemplate": "observation",
        "evidenceToCollect": [
          "Onboard links",
          "External components",
          "Actual input program",
          "Separate/combined tamper"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "manual",
        "noTarget": "I04.Q3",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "I01",
          "I02",
          "I03"
        ]
      },
      {
        "id": "I04.Q3",
        "revision": "2026-11-02.1",
        "routeId": "I04",
        "family": "I",
        "question": "Does the alarm transition match the intended input profile?",
        "why": "A correct alarm transition does not establish the separate tamper or mask function.",
        "testTemplate": "functional",
        "evidenceToCollect": [
          "Secure/alarm/lid state separately",
          "Mask/fault if supported",
          "Panel interpretation",
          "Restoration"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "impairment",
          "exactProfile"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "I04.Q4",
        "noTarget": "I01",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T1",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "I01",
          "I02",
          "I03"
        ]
      },
      {
        "id": "I04.Q4",
        "revision": "2026-11-02.1",
        "routeId": "I04",
        "family": "I",
        "question": "Does the tamper transition match the intended input profile?",
        "why": "Tamper needs a separate recorded transition; alarm operation cannot satisfy it.",
        "testTemplate": "functional",
        "evidenceToCollect": [
          "Lid or back-tamper state",
          "Panel interpretation",
          "Independent alarm result",
          "Mask/fault where supported",
          "Restoration"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "impairment",
          "exactProfile"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "handover",
        "noTarget": "I01",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T1",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "I01",
          "I02",
          "I03"
        ]
      }
    ],
    "closeout": [
      "Restore and prove both alarm and tamper.",
      "Keep the incident outcome separate from restoration; retain unresolved evidence and the named next action."
    ]
  },
  {
    "id": "I05",
    "title": "One case tamper vs several devices reporting tamper",
    "sourceBrief": "Compare first event, tamper loop/zone topology, lid/back tamper, shared auxiliary loss, expander communications and opening/closing sequence. One detector affected with correct supply → inspect device, mounting and monitored contact. Several devices simultaneous → check common tamper, expander, PSU and cable before treating them as independent alarms. If panel uses a global tamper loop, record loss of localisation and identify next accessible joint. Do not offer permanently linking tamper to clear the condition. [REF I01–I03, P01]",
    "systems": [
      "intruder"
    ],
    "sourceRefs": [
      "I01",
      "I02",
      "I03",
      "P01"
    ],
    "summary": "Compare first event, tamper loop/zone topology, lid/back tamper, shared auxiliary loss, expander communications and opening/closing sequence.",
    "revision": "2026-11-02.1",
    "reviewStatus": "generic-reviewed",
    "provenance": "Adapted from user-supplied FINDR research and implementation brief v1.0; question order is FINDR product design, not a manufacturer procedure.",
    "sourceBriefStatus": "Supplied research text. Model-specific examples require separate verification and are not enabled comparators.",
    "rules": [
      {
        "id": "I05.Q1",
        "revision": "2026-11-02.1",
        "routeId": "I05",
        "family": "I",
        "question": "Did several devices report tamper at the same recorded time?",
        "why": "A simultaneous pattern makes common power, expander or shared tamper more useful than independent-device assumptions.",
        "testTemplate": "display",
        "evidenceToCollect": [
          "First events",
          "Clocks",
          "Affected devices",
          "Common dependencies"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "I05.Q2",
        "noTarget": "I05.Q3",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "I01",
          "I02",
          "I03",
          "P01"
        ]
      },
      {
        "id": "I05.Q2",
        "revision": "2026-11-02.1",
        "routeId": "I05",
        "family": "I",
        "question": "Does the common expander report a current fault?",
        "why": "A shared expander failure can remove several alarm/tamper paths together; its supply is a separate observation.",
        "testTemplate": "display",
        "evidenceToCollect": [
          "Auxiliary status",
          "Expander communications",
          "Global tamper topology",
          "Recent work"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "I06",
        "noTarget": "P03",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "I01",
          "I02",
          "I03",
          "P01"
        ]
      },
      {
        "id": "I05.Q3",
        "revision": "2026-11-02.1",
        "routeId": "I05",
        "family": "I",
        "question": "Does the individual device's tamper indication follow its actual case state?",
        "why": "A case or mounting observation must be distinguished from an untraced input path.",
        "testTemplate": "contact",
        "evidenceToCollect": [
          "Lid/back tamper",
          "Mounting",
          "Supply",
          "Input state",
          "No permanent link-out"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "impairment"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "handover",
        "noTarget": "I01",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T1",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "I01",
          "I02",
          "I03",
          "P01"
        ]
      }
    ],
    "closeout": [
      "Do not offer permanently linking tamper to clear the condition.",
      "Keep the incident outcome separate from restoration; retain unresolved evidence and the named next action."
    ]
  },
  {
    "id": "I06",
    "title": "Expander, RIO or keypad offline",
    "sourceBrief": "Ask how many peripherals on that branch, local power at module, module address, bus topology/termination for this panel, first lost peer, recent extension or duplicate assignment. Log panel diagnostics and physical module LEDs, bus path and timestamps. Module unpowered → P03. Powered, group lost beyond an extension → cable/termination/address/shared data path. Investigate actual network rules. Single lost with others communicating → local module/branch/address. A whole expander going offline is a more informative lead than simultaneous individual zone opens. Verify inputs, tampers and bus diagnostics afterwards. [REF I01–I02, P01]",
    "systems": [
      "intruder"
    ],
    "sourceRefs": [
      "I01",
      "I02",
      "P01"
    ],
    "summary": "Ask how many peripherals on that branch, local power at module, module address, bus topology/termination for this panel, first lost peer, recent extension or duplicate assignment.",
    "revision": "2026-11-02.1",
    "reviewStatus": "generic-reviewed",
    "provenance": "Adapted from user-supplied FINDR research and implementation brief v1.0; question order is FINDR product design, not a manufacturer procedure.",
    "sourceBriefStatus": "Supplied research text. Model-specific examples require separate verification and are not enabled comparators.",
    "rules": [
      {
        "id": "I06.Q1",
        "revision": "2026-11-02.1",
        "routeId": "I06",
        "family": "I",
        "question": "Is the missing peripheral's local supply established during this fault?",
        "why": "An unpowered module is a common explanation for multiple input losses.",
        "testTemplate": "observation",
        "evidenceToCollect": [
          "Module identity",
          "Local LEDs",
          "Current supply evidence",
          "Panel diagnostics"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "I06.Q2",
        "noTarget": "P03",
        "unknownTarget": "P03",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "I01",
          "I02",
          "P01"
        ]
      },
      {
        "id": "I06.Q2",
        "revision": "2026-11-02.1",
        "routeId": "I06",
        "family": "I",
        "question": "Are the missing peripherals downstream of a confirmed recent branch change?",
        "why": "A lost group after an extension points towards the shared path before individual zones.",
        "testTemplate": "observation",
        "evidenceToCollect": [
          "Physical bus topology",
          "First lost peer",
          "Extension",
          "Supported termination",
          "Addresses"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "P06",
        "noTarget": "I06.Q3",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "I01",
          "I02",
          "P01"
        ]
      },
      {
        "id": "I06.Q3",
        "revision": "2026-11-02.1",
        "routeId": "I06",
        "family": "I",
        "question": "Is another device using the same peripheral address?",
        "why": "A duplicate identity can resemble a local module or communication-path fault.",
        "testTemplate": "display",
        "evidenceToCollect": [
          "Address evidence",
          "Communicating peers",
          "Panel version",
          "Required input/tamper/bus retest"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "manual",
        "noTarget": "handover",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "I01",
          "I02",
          "P01"
        ]
      }
    ],
    "closeout": [
      "Verify inputs, tampers and bus diagnostics afterwards.",
      "Keep the incident outcome separate from restoration; retain unresolved evidence and the named next action."
    ]
  },
  {
    "id": "I07",
    "title": "Random PIR alarms or anti-mask/fault",
    "sourceBrief": "Capture exact event designation, area/armed state, time cluster, source zone, movement/animals, HVAC/draught, sunlight, obstructions, spray/cleaning and vibration. For a supported anti-mask unit separate mask, fault and alarm indications and test each intended condition by the manual. A brief motion test can pass while environmental alarms recur. If detections coincide with environmental change, record correlation and plan observation. If events coincide with supply dips, follow P04/P08. Avoid reducing sensitivity or removing protection as an automatic fix. [REF I01, I03, I07]",
    "systems": [
      "intruder"
    ],
    "sourceRefs": [
      "I01",
      "I03",
      "I07"
    ],
    "summary": "Capture exact event designation, area/armed state, time cluster, source zone, movement/animals, HVAC/draught, sunlight, obstructions, spray/cleaning and vibration.",
    "revision": "2026-11-02.1",
    "reviewStatus": "generic-reviewed",
    "provenance": "Adapted from user-supplied FINDR research and implementation brief v1.0; question order is FINDR product design, not a manufacturer procedure.",
    "sourceBriefStatus": "Supplied research text. Model-specific examples require separate verification and are not enabled comparators.",
    "rules": [
      {
        "id": "I07.Q1",
        "revision": "2026-11-02.1",
        "routeId": "I07",
        "family": "I",
        "question": "Does the panel distinguish this event as alarm, mask or fault?",
        "why": "These indications have different meanings and must not be merged into one detector failure.",
        "testTemplate": "display",
        "evidenceToCollect": [
          "Exact designation",
          "Zone",
          "Armed state",
          "Time cluster",
          "Model support"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "I07.Q2",
        "noTarget": "manual",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "I01",
          "I03",
          "I07"
        ]
      },
      {
        "id": "I07.Q2",
        "revision": "2026-11-02.1",
        "routeId": "I07",
        "family": "I",
        "question": "Does the event coincide with an observed environmental condition?",
        "why": "Correlation with sunlight, HVAC, animals or cleaning guides evidence collection but does not prove cause.",
        "testTemplate": "observation",
        "evidenceToCollect": [
          "Location",
          "Witnessed exposure",
          "Movement",
          "Cleaning/obstruction",
          "Times"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "P08",
        "noTarget": "I07.Q3",
        "unknownTarget": "P08",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "I01",
          "I03",
          "I07"
        ]
      },
      {
        "id": "I07.Q3",
        "revision": "2026-11-02.1",
        "routeId": "I07",
        "family": "I",
        "question": "Does the event coincide with a recorded supply dip?",
        "why": "A time-matched electrical change is a different lead from environmental alarms.",
        "testTemplate": "display",
        "evidenceToCollect": [
          "Supply event",
          "Detector time",
          "Alarm chronology",
          "Current baseline",
          "Return evidence"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "P04",
        "noTarget": "P08",
        "unknownTarget": "P08",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "I01",
          "I03",
          "I07"
        ]
      }
    ],
    "closeout": [
      "Avoid reducing sensitivity or removing protection as an automatic fix.",
      "Keep the incident outcome separate from restoration; retain unresolved evidence and the named next action."
    ]
  },
  {
    "id": "I08",
    "title": "Wireless supervision, jamming or low battery",
    "sourceBrief": "Record device/parent, type of radio fault, one vs many devices, last message/time, current qualified signal metrics, configured supervision/test intervals, batteries and polarity per manual, recent obstructions/interference and route where supported. One weak device → check local battery, siting or path. Several simultaneous losses → receiver/panel power, common RF conditions, path/repeater or communications. “Jamming” reported by the system is evidence of an RF condition, not proof of intent. Test at the device’s installed position, respect wake/sleep behaviour, verify a current message and supervision. [REF I01, I05]",
    "systems": [
      "intruder"
    ],
    "sourceRefs": [
      "I01",
      "I05"
    ],
    "summary": "Record device/parent, type of radio fault, one vs many devices, last message/time, current qualified signal metrics, configured supervision/test intervals, batteries and polarity per manual, recent obstructions/interference and route where supported.",
    "revision": "2026-11-02.1",
    "reviewStatus": "generic-reviewed",
    "provenance": "Adapted from user-supplied FINDR research and implementation brief v1.0; question order is FINDR product design, not a manufacturer procedure.",
    "sourceBriefStatus": "Supplied research text. Model-specific examples require separate verification and are not enabled comparators.",
    "rules": [
      {
        "id": "I08.Q1",
        "revision": "2026-11-02.1",
        "routeId": "I08",
        "family": "I",
        "question": "Are several lost radio devices associated with the same receiver or parent?",
        "why": "A common parent or RF condition differs from one local battery/path issue.",
        "testTemplate": "display",
        "evidenceToCollect": [
          "Parent",
          "Affected children",
          "Fault kind",
          "Last current message",
          "Time"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "I08.Q2",
        "noTarget": "I08.Q3",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "I01",
          "I05"
        ]
      },
      {
        "id": "I08.Q2",
        "revision": "2026-11-02.1",
        "routeId": "I08",
        "family": "I",
        "question": "Does the common receiver have a recorded power or communication problem?",
        "why": "Shared receiver evidence should be checked before replacing multiple wireless devices.",
        "testTemplate": "display",
        "evidenceToCollect": [
          "Receiver status",
          "Power domain",
          "Interference indication",
          "Recent obstruction"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "P03",
        "noTarget": "I08.Q3",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "I01",
          "I05"
        ]
      },
      {
        "id": "I08.Q3",
        "revision": "2026-11-02.1",
        "routeId": "I08",
        "family": "I",
        "question": "Has a fresh supervised message arrived from the installed device position?",
        "why": "A stale signal metric cannot prove present radio function; a jamming indication does not prove intent.",
        "testTemplate": "functional",
        "evidenceToCollect": [
          "Wake/test behaviour",
          "Current message",
          "Qualified metric",
          "Battery type/state",
          "Installed location"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "impairment"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "handover",
        "noTarget": "manual",
        "unknownTarget": "handover",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T1",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "I01",
          "I05"
        ]
      }
    ],
    "closeout": [
      "Test at the device’s installed position, respect wake/sleep behaviour, verify a current message and supervision.",
      "Keep the incident outcome separate from restoration; retain unresolved evidence and the named next action."
    ]
  },
  {
    "id": "I09",
    "title": "External sounder/strobe, bell tamper or fails under load",
    "sourceBrief": "Identify unit, SAB/SCB or other supported mode, local battery, hold-off supply, trigger polarity, separate strobe and tamper return. Log configured bell test vs real trigger, panel output observation, external supply at device during demand, lid/back tamper and result with occupant/ARC arrangements. If trigger changes but device supply collapses → P03/P04. If no trigger → examine programming/output. If local supply/trigger are correct → device-specific self-test/service. Battery-backed sounders can operate on loss of supply. Use authorised procedure and safe access. [REF I01, I06, P01]",
    "systems": [
      "intruder"
    ],
    "sourceRefs": [
      "I01",
      "I06",
      "P01"
    ],
    "summary": "Identify unit, SAB/SCB or other supported mode, local battery, hold-off supply, trigger polarity, separate strobe and tamper return.",
    "revision": "2026-11-02.1",
    "reviewStatus": "generic-reviewed",
    "provenance": "Adapted from user-supplied FINDR research and implementation brief v1.0; question order is FINDR product design, not a manufacturer procedure.",
    "sourceBriefStatus": "Supplied research text. Model-specific examples require separate verification and are not enabled comparators.",
    "rules": [
      {
        "id": "I09.Q1",
        "revision": "2026-11-02.1",
        "routeId": "I09",
        "family": "I",
        "question": "Does the configured trigger change during the agreed sounder test?",
        "why": "No trigger and a triggered unit failing under load select different branches.",
        "testTemplate": "display",
        "evidenceToCollect": [
          "Unit/mode",
          "Trigger polarity",
          "Panel test versus real demand",
          "Bell/strobe separately"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "I09.Q2",
        "noTarget": "manual",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "I01",
          "I06",
          "P01"
        ]
      },
      {
        "id": "I09.Q2",
        "revision": "2026-11-02.1",
        "routeId": "I09",
        "family": "I",
        "question": "Does the external unit's supply fall during that trigger?",
        "why": "A load-related supply loss directs attention to path and demand rather than assuming the sounder is defective.",
        "testTemplate": "voltage",
        "evidenceToCollect": [
          "Hold-off supply",
          "Device terminals",
          "Local battery",
          "Same-state voltage",
          "Test arrangements"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "energised",
          "instrument",
          "impairment"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "P04",
        "noTarget": "I09.Q3",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T1",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "I01",
          "I06",
          "P01"
        ]
      },
      {
        "id": "I09.Q3",
        "revision": "2026-11-02.1",
        "routeId": "I09",
        "family": "I",
        "question": "Did the required audible or visual function physically operate?",
        "why": "Correct drive does not establish acoustic/visual operation or tamper restoration.",
        "testTemplate": "functional",
        "evidenceToCollect": [
          "Actual response",
          "Lid/back tamper",
          "Supported self-test",
          "Final service state"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "impairment"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "handover",
        "noTarget": "manual",
        "unknownTarget": "handover",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T1",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "I01",
          "I06",
          "P01"
        ]
      }
    ],
    "closeout": [
      "Use authorised procedure and safe access.",
      "Keep the incident outcome separate from restoration; retain unresolved evidence and the named next action."
    ]
  },
  {
    "id": "I10",
    "title": "Won’t set / entry-exit disorder / one area affected",
    "sourceBrief": "Ask exact reason displayed, open zones, tamper, comms faults, omitted zones, area/partition, final exit/entry route, user role, part/full set and time. Log sequence and zone transitions without storing user codes. Zone never restores → door/contact branch. All needed states correct but wrong area/time/permission → review configuration with authority. A required zone omission, forced set or lowered grade is not a repair. Retest the agreed setting and entry/exit behaviour, including affected monitoring under the arranged test window. [REF I01–I02, I05]",
    "systems": [
      "intruder"
    ],
    "sourceRefs": [
      "I01",
      "I02",
      "I05"
    ],
    "summary": "Ask exact reason displayed, open zones, tamper, comms faults, omitted zones, area/partition, final exit/entry route, user role, part/full set and time.",
    "revision": "2026-11-02.1",
    "reviewStatus": "generic-reviewed",
    "provenance": "Adapted from user-supplied FINDR research and implementation brief v1.0; question order is FINDR product design, not a manufacturer procedure.",
    "sourceBriefStatus": "Supplied research text. Model-specific examples require separate verification and are not enabled comparators.",
    "rules": [
      {
        "id": "I10.Q1",
        "revision": "2026-11-02.1",
        "routeId": "I10",
        "family": "I",
        "question": "Does the displayed setting refusal identify a zone that has not restored?",
        "why": "An explicit open-zone condition is different from user role, area or schedule behaviour.",
        "testTemplate": "display",
        "evidenceToCollect": [
          "Exact reason",
          "Open zones",
          "Tampers",
          "Area",
          "Setting mode",
          "No user codes"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "I02",
        "noTarget": "I10.Q2",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "I01",
          "I02",
          "I05"
        ]
      },
      {
        "id": "I10.Q2",
        "revision": "2026-11-02.1",
        "routeId": "I10",
        "family": "I",
        "question": "Does the intended user role have the required area and time permission?",
        "why": "A permission boundary must not be bypassed by broad granting, omission or lowered protection.",
        "testTemplate": "observation",
        "evidenceToCollect": [
          "Role alias",
          "Area/partition",
          "Time profile",
          "Final exit",
          "Approved configuration"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "I10.Q3",
        "noTarget": "handover",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "I01",
          "I02",
          "I05"
        ]
      },
      {
        "id": "I10.Q3",
        "revision": "2026-11-02.1",
        "routeId": "I10",
        "family": "I",
        "question": "Does the recorded entry/exit sequence match the approved arrangement?",
        "why": "Sequence evidence can locate the function needing review without forcing a set.",
        "testTemplate": "observation",
        "evidenceToCollect": [
          "Zone transitions",
          "Entry/exit times",
          "Part/full setting",
          "Monitoring outcome",
          "Required retest"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "handover",
        "noTarget": "manual",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "I01",
          "I02",
          "I05"
        ]
      }
    ],
    "closeout": [
      "Retest the agreed setting and entry/exit behaviour, including affected monitoring under the arranged test window.",
      "Keep the incident outcome separate from restoration; retain unresolved evidence and the named next action."
    ]
  },
  {
    "id": "I11",
    "title": "Signalling failure, one path or ARC misses an event",
    "sourceBrief": "Record communicator model and method (pin/digital integration), configured paths, independent path statuses, last poll/fail/restore, panel event, communicator input/event, transmission and ARC acknowledgement with matching account/event/restore/time. One path lost with another functioning means redundancy degraded. Healthy paths with missing event → look at input mapping/account/service status. Alert arrived under wrong identity → configuration/ARC investigation. Do not unplug working paths to force a test automatically. Close only the functions confirmed with the monitoring provider and document outstanding path faults. [REF I04, I01]",
    "systems": [
      "intruder"
    ],
    "sourceRefs": [
      "I04",
      "I01"
    ],
    "summary": "Record communicator model and method (pin/digital integration), configured paths, independent path statuses, last poll/fail/restore, panel event, communicator input/event, transmission and ARC acknowledgement with matching account/event/restore/time.",
    "revision": "2026-11-02.1",
    "reviewStatus": "generic-reviewed",
    "provenance": "Adapted from user-supplied FINDR research and implementation brief v1.0; question order is FINDR product design, not a manufacturer procedure.",
    "sourceBriefStatus": "Supplied research text. Model-specific examples require separate verification and are not enabled comparators.",
    "rules": [
      {
        "id": "I11.Q1",
        "revision": "2026-11-02.1",
        "routeId": "I11",
        "family": "I",
        "question": "Did the communicator record the intended panel event at its input?",
        "why": "Input mapping and remote delivery are separate boundaries.",
        "testTemplate": "display",
        "evidenceToCollect": [
          "Panel event",
          "Communicator method",
          "Input/event",
          "Clock offset",
          "No ARC authentication details"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "I11.Q2",
        "noTarget": "F12",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "I04",
          "I01"
        ]
      },
      {
        "id": "I11.Q2",
        "revision": "2026-11-02.1",
        "routeId": "I11",
        "family": "I",
        "question": "Did the ARC confirm receipt of the matching event?",
        "why": "Healthy transport or an online indicator does not prove event delivery.",
        "testTemplate": "observation",
        "evidenceToCollect": [
          "Event/account alias",
          "Path",
          "Receipt time",
          "Provider acknowledgement"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "I11.Q3",
        "noTarget": "handover",
        "unknownTarget": "handover",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "I04",
          "I01"
        ]
      },
      {
        "id": "I11.Q3",
        "revision": "2026-11-02.1",
        "routeId": "I11",
        "family": "I",
        "question": "Are all required signalling paths currently available?",
        "why": "A working alternate path does not remove the impairment of lost redundancy.",
        "testTemplate": "display",
        "evidenceToCollect": [
          "Each path status",
          "Fail/restore chronology",
          "Matching restore receipt",
          "Outstanding provider action"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "handover",
        "noTarget": "handover",
        "unknownTarget": "handover",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "I04",
          "I01"
        ]
      }
    ],
    "closeout": [
      "Close only the functions confirmed with the monitoring provider and document outstanding path faults.",
      "Keep the incident outcome separate from restoration; retain unresolved evidence and the named next action."
    ]
  },
  {
    "id": "I12",
    "title": "Panel reboots, time lost or AUX fault across detectors",
    "sourceBrief": "Record exact panel/expander clocks and restart events, loss of mains, battery state, charger/aux output and field devices affected, load/cable conditions, recurrence with bell or peripheral activation. Stable voltage at panel but low at expander under load → P03/P04. Several powered detectors simultaneously losing alarm relays may reflect a common AUX failure. A recent battery change does not establish charging or usable capacity. Verify normal powered operation, alarm/tamper and supported standby/restore under the approved plan. [REF I01–I02, P01–P02]",
    "systems": [
      "intruder"
    ],
    "sourceRefs": [
      "I01",
      "I02",
      "P01",
      "P02"
    ],
    "summary": "Record exact panel/expander clocks and restart events, loss of mains, battery state, charger/aux output and field devices affected, load/cable conditions, recurrence with bell or peripheral activation.",
    "revision": "2026-11-02.1",
    "reviewStatus": "generic-reviewed",
    "provenance": "Adapted from user-supplied FINDR research and implementation brief v1.0; question order is FINDR product design, not a manufacturer procedure.",
    "sourceBriefStatus": "Supplied research text. Model-specific examples require separate verification and are not enabled comparators.",
    "rules": [
      {
        "id": "I12.Q1",
        "revision": "2026-11-02.1",
        "routeId": "I12",
        "family": "I",
        "question": "Do the affected devices share the same confirmed auxiliary supply?",
        "why": "Common power evidence is more informative than simultaneous independent detector failures.",
        "testTemplate": "observation",
        "evidenceToCollect": [
          "Supply domain",
          "Affected devices",
          "Panel/expander clocks",
          "Building work"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "I12.Q2",
        "noTarget": "I06",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "I01",
          "I02",
          "P01",
          "P02"
        ]
      },
      {
        "id": "I12.Q2",
        "revision": "2026-11-02.1",
        "routeId": "I12",
        "family": "I",
        "question": "Does a restart or time-loss event coincide with a change in supply state?",
        "why": "Coincidence selects a useful comparison but does not prove battery capacity or charger health.",
        "testTemplate": "display",
        "evidenceToCollect": [
          "Restart history",
          "Mains/battery state",
          "Charge indication",
          "Event times"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "readOnly"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "P05",
        "noTarget": "I12.Q3",
        "unknownTarget": "P08",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T0",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "I01",
          "I02",
          "P01",
          "P02"
        ]
      },
      {
        "id": "I12.Q3",
        "revision": "2026-11-02.1",
        "routeId": "I12",
        "family": "I",
        "question": "Does source voltage remain stable while the affected field supply falls under the same load?",
        "why": "Comparable source/load evidence separates distribution loss from common supply decline.",
        "testTemplate": "voltage_drop",
        "evidenceToCollect": [
          "Same source",
          "Panel/device pairs",
          "Load condition",
          "Time",
          "Standby/alarm restoration"
        ],
        "requires": [
          "readOnly"
        ],
        "testRequires": [
          "energised",
          "instrument"
        ],
        "hardBlocks": [
          "emergency",
          "unsafeAccess",
          "hazardousAreaWithoutSpecialist"
        ],
        "yesTarget": "P06",
        "noTarget": "P04",
        "unknownTarget": "manual",
        "blockedTarget": "handover",
        "nextIfContradiction": "manual",
        "retestCriteria": "Fresh symptom state, documented repair or changed prerequisite; link the retest to the earlier event without replacing it.",
        "reviewStatus": "generic-reviewed",
        "profileTier": "T1",
        "numericComparatorsEnabled": false,
        "sourceRefs": [
          "I01",
          "I02",
          "P01",
          "P02"
        ]
      }
    ],
    "closeout": [
      "Verify normal powered operation, alarm/tamper and supported standby/restore under the approved plan.",
      "Keep the incident outcome separate from restoration; retain unresolved evidence and the named next action."
    ]
  }
];

const routeIndex = new Map(FIELD_ROUTES.map(route=>[route.id,route]));
const ruleIndex = new Map(FIELD_ROUTES.flatMap(route=>route.rules.map(rule=>[rule.id,rule])));
export const getRoute = id => routeIndex.get(id) || null;
export const getRule = id => ruleIndex.get(id) || null;
export const rulesForRoute = id => getRoute(id)?.rules || [];
