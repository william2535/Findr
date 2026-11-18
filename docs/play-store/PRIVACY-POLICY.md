# FINDR privacy policy

**Last updated: 18 November 2026**

This policy covers the separate FINDR Google Play app, package **`com.findr.play`**, developed by **Will Flood**. For support, a privacy question or a deletion request, contact **[Williamflood8@gmail.com](mailto:Williamflood8@gmail.com)**. Will Flood is responsible for the developer-held personal information described in this policy; FINDR is not a separate incorporated company.

## Free app and optional services

FINDR is free to download and use. FINDR does not charge a subscription or sell access to its features. You do not need to provide payment-card details to FINDR.

Optional external AI services have their own accounts, usage limits and pricing. Connecting your own provider account is your choice, and that provider may charge you under its terms. A free FINDR download does not include unlimited third-party AI usage. Your network provider may also charge for internet data used to download manuals, packs or AI resources.

## Information stored on your device

FINDR keeps selected/imported manuals, PDF files, extracted text, page references, indexes, downloaded local AI resources, Panel Pals conversations, equipment details, fault observations, readings, reports, practice progress and preferences in its local app storage. These support document search, offline use, engineering records and continuity between visits. You do not need a FINDR account to use these functions.

You choose files through Android's document picker. Importing a PDF for local processing does not automatically send that PDF or your manual library to an AI provider. Local manual search and supported on-device inference can work without Online AI. Online AI is not enabled automatically.

Android's app sandbox and WebView storage protect access between ordinary applications. FINDR does not claim that its own database or exported files have a separate layer of encryption. Protect your phone and keep backups of important work. Clearing app storage or uninstalling can remove the information kept on the device.

## Downloads and connections

Obtaining a manual, model, pack or other resource requires contacting its publisher or hosting service. Opening a source link or checking for an update also makes a network request. Those services receive normal connection information, such as IP address and request metadata. Depending on the resource, requests may pass through FINDR's hosting service. GitHub hosts some archive and pack resources.

The Android app requests Internet access and uses the system document picker for chosen files. It does not require broad access to contacts, location, microphone or all files on the device. External websites operate under their own privacy policies. Opening or downloading external content is not an offline action.

## Optional online AI

Online AI requires you to choose a supported provider and accept the data disclosure. Current provider options are Groq and OpenAI, using your own API account. Local processing remains a separate option; failure of a local model does not silently authorise cloud processing.

When you use Online AI, FINDR sends the bounded question, relevant conversation and equipment context, and selected manual excerpts through FINDR's HTTPS relay to the chosen provider. This enables request interpretation and an answer grounded in the selected evidence. The request does not automatically include your whole PDF library or other Pals' conversations. Information you type can contain personal or sensitive details, so include only material you are authorised to send.

Your API key is kept in the running app session's memory and passes through the relay to authenticate the provider request. FINDR's application code does not save it in Pals, exports, IndexedDB or browser storage, and does not log request bodies or keys. Disconnecting clears the in-memory credential; after the app session ends you must reconnect to use the provider. You can revoke keys through your provider account.

The relay application processes requests without saving a conversation database. This is not a promise of zero retention by the hosting infrastructure or AI provider. Provider account settings, security and abuse monitoring, legal requirements and their retention policies still apply. See [Groq's data policy](https://console.groq.com/docs/your-data) and [OpenAI's API data controls](https://developers.openai.com/api/docs/guides/your-data). FINDR does not process payment-card details; any API charges are managed by your provider.

## Voluntary AI-answer reports

In the current internal draft, version **0.40.1-play.1**, the reporting service is not connected. The form says reporting is unavailable, disables sending and does not submit a report. The following describes the optional service when it is configured.

When reporting is available and you choose to send a report, FINDR asks you to review the problem category, description and optional answer excerpt first. The report also contains a random report reference, app version, package name and confirmation that you agreed to send it. The reporting service records receipt/expiry timestamps and a payload checksum to handle retries without duplicating the same report.

A report does not automatically attach your jobs, manual files, other conversations or API keys. You can remove identifying information from the form before sending. The report is used by the developer to investigate problematic output and improve the app. It is not posted to a public GitHub issue or a public report feed.

The report form is held in memory while open. FINDR shows success only after the service confirms receipt. If a send fails, you can retry while the form remains open; it is not silently sent later from a persistent background queue. Closing the form discards its local contents. Cancelling a request cannot retract a report that the server has already received; contact the developer with its reference if you want it removed.

The reporting service uses Cloudflare Workers and D1. Active report records are scheduled to expire after 29 days, with hourly cleanup intended to remove them within 30 days. There is no public endpoint for reading reports; developer access uses the authenticated service account. The application does not store IP address or User-Agent in its report database. Cloudflare receives ordinary network metadata, and IP address is used transiently for rate limiting. Platform backups, recovery history and security/network logs are separate from the active report records and follow the platform's applicable retention and service controls; they are not promised to disappear at the same instant as an active record.

A review build with no configured reporting service says reporting is unavailable and does not claim that a report was sent.

## Support and exports

If you email support, the developer receives your email address and the information you include, and uses it to respond and resolve the issue. Please do not email API keys, passwords or unnecessary customer/site details. Support correspondence is retained as needed to handle the enquiry and any related legal obligations; you can request its deletion using the contact above.

Reports and other exports are created when you request them and saved to a location you choose. They may contain job details, readings and conversation text. If you share them, the recipient or chosen storage service controls its copy. Clearing FINDR storage does not delete those external copies.

## Why the developer uses personal information

Where UK data protection law applies, the developer relies on these lawful bases for information they receive:

- **Consent** for the optional Online AI relay and voluntary AI-answer reports. You choose whether to use these features. Declining does not prevent saved-manual search or other local functions. Disconnect Online AI to stop future requests; email the contact above with a report reference to withdraw consent for further use of a submitted report.
- **Legitimate interests** in answering support enquiries you send, resolving the issues you ask for help with, and keeping online services secure against misuse. This covers the information reasonably needed for those purposes, such as your correspondence and transient connection information used to limit abusive requests. You can object to this processing using the contact above.
- **Legal obligations**, where the law requires handling or retaining information, such as responding to a valid data-rights request.

Withdrawing consent does not affect processing already lawfully carried out. These bases do not authorise unrelated advertising or reuse of your job records. FINDR does not use personal information to make solely automated decisions about your legal rights or eligibility for services; its technical suggestions remain for the engineer to assess.

## Service providers and security

FINDR's relay and feedback hosting, GitHub resource hosting, your selected AI provider and the email service used for support process information necessary for those functions. Their own infrastructure may process connection and security metadata. Relevant policies include [Cloudflare](https://www.cloudflare.com/privacypolicy/), [GitHub](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement) and the AI-provider policies linked above.

These providers may process information outside the United Kingdom. Their applicable privacy notices describe processing locations, transfer safeguards and account controls. Do not assume that selecting an online service keeps information in the UK.

For information about the transfer arrangements applying to developer-operated services, or a copy of applicable safeguards, contact the developer. Provider links above also explain how to obtain their relevant privacy or contractual documents.

FINDR uses HTTPS for its online AI and reporting connections. Its application does not include an advertising/analytics SDK or use job records for advertising. No transmission or storage system is infallible; avoid storing or sending credentials and information unnecessary for the task.

## Deletion and choices

You can keep Online AI disconnected, use saved-manual search, choose supported local inference, remove local records through FINDR, or clear the Android app's storage. Deleting a Pal removes its saved conversations and context but deliberately retains shared manuals and model resources; remove those separately if desired. Clearing storage does not remove data already sent to providers, support, or a recipient of an export.

For information received by the developer, email **[Williamflood8@gmail.com](mailto:Williamflood8@gmail.com)**. Give the report reference or enough detail to locate the relevant correspondence, without including unnecessary personal information. The developer can act on records under their control; provider-held account data may require a separate request to that provider. Deletion may be limited where retention is required by law or necessary to establish, exercise or defend a legal claim.

Depending on the circumstances and applicable law, you may also have rights to access or correct personal information, restrict or object to processing, or receive a portable copy. You can withdraw your choice to use optional online features by disconnecting them; this does not undo processing already carried out. Contact the developer to exercise rights over information they hold. You can raise a concern with the UK's [Information Commissioner's Office](https://ico.org.uk/make-a-complaint/).

## Audience and policy changes

FINDR is intended for fire and security engineers and learners, and is not designed as a child-directed service. It is a reference and record-keeping aid, not a replacement for manufacturer instructions, competence or site safety arrangements.

Changes will be dated in this policy. The current public policy is available at [FINDR's privacy-policy page](https://william2535.github.io/Findr/privacy/).
