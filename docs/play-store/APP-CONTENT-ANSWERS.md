# FINDR Play Console answers — NOT SUBMITTED

Prepared **18 November 2026** for `com.findr.play`, internal draft `0.40.1-play.1` / version code `1`. These are answers and review notes for the Console forms, not evidence that those forms have been saved or accepted.

Owner-confirmed: FINDR is free; intended audience **16–17 and 18+**; publishing as a **personal hobby/student project**, not in connection with a business or professional service. Support contact: **Williamflood8@gmail.com**.

## Main declarations

| Console section | Answer for the reviewed build | Reason / remaining action |
| --- | --- | --- |
| Privacy policy | `https://william2535.github.io/Findr/privacy/` | Public HTML policy. The owner's screenshot shows this item completed. |
| Sign-in details / App access | **Some functionality is restricted** | Core tools need no FINDR login, but optional Online AI requires a provider API key. Use the instructions below and provide valid dedicated reviewer access before submitting for review. |
| Ads | **Yes** | Home contains a promotional Zone Sketch banner. Google includes banners promoting a developer's other apps as house ads, even without an ad SDK. Changing its destination or closing a public website/APK does not change this while the banner remains in this build. |
| Target audience | Select **16–17** and **18 and over** | Confirmed by the owner. Do not select younger groups. This is the intended audience, not a calculated content rating. |
| Government apps | **No** | FINDR is an independent student project, not an official government app. |
| Financial features | **My app doesn't provide any financial features** / equivalent | No banking, lending, investment, payment or wallet function. Electrical calculators are not financial features. External AI account billing is not a FINDR financial service. |
| Health | **My app doesn't have any health features** / equivalent | It supports engineering equipment and records, not medical diagnosis, treatment, fitness or personal health monitoring. Fire/life-safety equipment references do not make it a health app. |
| Trader status | Recommend **I am not a trader**, on the owner's stated circumstances | The basis is the confirmed personal hobby/student purpose, not simply that the app is free. Reassess if distribution becomes part of business/professional activity or commercial arrangements. |

## Copyable app-access instructions

Instruction title: **FINDR core tools and optional Online AI**

```text
FINDR does not require a FINDR account or subscription. Manuals, local PDF import,
panel emulators, menu maps, engineering tools, quizzes and saved engineering logs
are accessible without signing in.

For Panel Pals, open Panel Pals, choose Make a pal, select a system/model and save
its manuals, or upload a local PDF. Manual search does not require an AI account.
Offline AI requires downloading the displayed model resources and a supported
device; the app displays its actual readiness.

Optional Online AI requires a Groq or OpenAI API key. Open a Panel Pal, choose
Online AI, open Online setup, select the provider, enter the dedicated review API
key supplied separately in these Console access details, and accept the displayed
sharing disclosure. Questions and relevant manual excerpts are then sent to that
provider through FINDR. No paid FINDR feature unlock is required.

Support: Williamflood8@gmail.com
```

**Not complete until reviewer access exists:** no AI provider credential is included in this document or known to have been supplied in Console. A reviewer must not have to create or pay for their own provider account to inspect this feature. Supply a maintained, reusable dedicated review credential through the private Console access fields. Do not use the Google Play publishing service-account JSON or upload-signing key, and do not put credentials in this repository or chat. Instructions must match the provider and actual valid access supplied.

## Content rating questionnaire

- Correspondence email: **Williamflood8@gmail.com**.
- Choose **All Other App Types**, or the equivalent utility/reference category shown. FINDR's main purpose is engineering assistance, even though it includes revision quizzes and emulators.
- Disclose **language/profanity**: the bundled terminal introduction says **“let’s find that shit.”** (`public/app/terminal-flow.mjs`, line 100). Use the questionnaire's examples to classify the exact wording; do not claim that no language is present or invent a PEGI/IARC result.
- The Give up reaction shows an angry avatar, **“NOOO…”** and **“Fine. I’m calling in backup.”** for about 2.3 seconds, with a skip and reduced-motion handling. It has no depicted injury or fighting. Describe it accurately if a question asks about frightening/intense effects.
- No user-to-user chat, social feed or public posting was found. Local records and deliberate file exports do not themselves create a social messaging feature.
- No unrestricted in-app web browser was found. The native app sends external links to an external handler. Manual downloads and imported documents still need to be disclosed if asked about downloadable content.
- No in-app digital purchases or automatic user-location sharing feature was found. No intended sexual, gambling, drug-use or violent entertainment content was identified in the reviewed app UI. Third-party manuals and arbitrary model output have not been exhaustively audited; use each actual question's wording.
- If asked whether the app generates AI responses, answer **Yes**. Do not describe Panel Pals as only fixed, pre-written educational text.

The questionnaire calculates regional ratings. **16–17 and 18+ target audience selections do not set or guarantee a rating.** Review the calculated summary before submitting.

## Data safety — supported answers and open evidence

**Does the app collect user data? Yes.** Optional Online AI sends questions, context and selected manual excerpts off the device. Being optional, free, locally stored by default, or processed without a FINDR conversation database does not make the whole app “no collection.”

| Observed flow | Relevant form response / purpose | Qualification |
| --- | --- | --- |
| Online questions, observations and selected conversation context | User-generated content; **App functionality**; **Optional** | Use the current form's applicable user-generated-content/message categories. Confirm the exact category wording for AI prompts rather than treating the AI as another human user. |
| Selected text from an engineer's uploaded manual/document | **Files and documents** where its contents are transmitted; **App functionality**; **Optional** | The whole PDF library is not automatically sent. On-device import/search alone does not send the PDF to an AI provider. |
| API key supplied for optional Online AI | Authentication data needed for **App functionality**, optional | Stored in app-session memory and passed through the relay to the selected provider. Confirm the current form's applicable account/identifier classification; do not call a key a password or advertising ID without matching the definition. |
| Local manuals, logs, practice progress and preferences | Local-only use is not off-device collection | Context included in an Online AI request must be accounted for separately. |
| Report form | **No report submission in current internal draft** | The reporting service is unconfigured and sending is disabled in `0.40.1-play.1`. If enabled later, add the actual report content/metadata and purposes and verify retention/deletion. |

Additional source-supported answers:

- FINDR does **not** create user accounts. Do not confuse an external provider account with creating a FINDR account.
- No FINDR payment-card entry, advertising SDK, analytics SDK or device-location permission was found in the inspected implementation.
- AI requests use HTTPS, and the Android manifest blocks cleartext. Confirm all final data-bearing endpoints before making the form's universal encryption-in-transit declaration.
- Local data can be removed in the app or by clearing Android app storage. Requests about developer-held records go to the support address. This does not delete copies held by a selected provider or recipients of exported files.

**Not established yet:** provider/hosting account-specific retention and log settings; whether all third-party transfers qualify for a sharing exemption; whether any relevant processing is truly ephemeral end-to-end; final metadata/IP/identifier categories; and the final network behaviour of all enabled features. Do not guess “no sharing,” “ephemeral only,” “no identifiers,” or a security certification. Use [DATA-SAFETY-DRAFT.md](DATA-SAFETY-DRAFT.md) for the detailed evidence checklist. These unresolved fields prevent an honest completed Data safety submission today.

## Submission access and sources

The connected publisher workflow can upload the app. Current Android Publisher discovery includes a **Data safety write endpoint**; it does not expose the other shown content declarations as equivalent form-write methods. A supported endpoint alone does not establish complete answers or provide the current CSV template. This session has no authenticated Play Console desktop/browser tool, so **none of these forms was submitted**. Additional API/admin privileges do not by themselves create an interactive Console session.

Source inspection: `public/app/app.mjs`, `terminal-flow.mjs`, `helpers.mjs`, `helpers-faults.mjs`, `helpers-store.mjs`, `online-language.mjs`, `online-language-policy.mjs`, `lib/online-assistant.mjs`, and `android-play/app/src/main/java/com/findr/play/MainActivity.java`.

Official references checked 18 November 2026:

- [Google: app-content declarations, house ads and access](https://support.google.com/googleplay/android-developer/answer/9859455?hl=en)
- [Google: reviewer access requirements](https://support.google.com/googleplay/android-developer/answer/15748846?hl=en)
- [Google: trader status declaration](https://support.google.com/googleplay/android-developer/answer/17594752?hl=en-GB)
- [Google: content rating questionnaire](https://support.google.com/googleplay/android-developer/answer/9859655?hl=en)
- [IARC: how ratings and interactive elements work](https://globalratings.com/how-iarc-works/)
- [Google: Data safety definitions](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en)
- [Android Publisher: Data safety write method](https://developers.google.com/android-publisher/api-ref/rest/v3/applications/dataSafety)
