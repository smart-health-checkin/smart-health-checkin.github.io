# SMART Health Check-in: background

Shared background for every section of smart-health-checkin.org, for an AI model helping someone understand SMART Health Check-in or build with it. Where this page and the specification differ, the specification is right.

## What it is

Before a visit, clinics ask patients for the same information again and again: allergies, medications, insurance, intake questionnaires. SMART Health Check-in lets the patient answer from a health app of their own choice: an app that already holds their records, collected from their doctors' and hospitals' patient portals, and that can help them answer the clinic's other questions. The clinic's page asks for what the visit needs, the patient decides item by item what to share, and the answer comes back to that page as FHIR data. The phone or browser finds the patient's installed app, so the clinic's page doesn't need to know which one they use.

## Roles

- **Verifier:** the software that asks, then checks the response against its request before using it: an EHR's check-in page, a patient portal, a front-desk kiosk, or a clinic's native app.
- **Wallet:** the patient's health app, native on the phone or a web wallet (a website that opens in a browser tab). It shows the request to the patient and builds, signs, and encrypts the response.
- **Holder:** the patient, or a person acting for them, who decides what to share.

## How a check-in works

1. The Verifier builds a request: an `id`, an optional `purpose`, and `items`. Each item has an `id`, a `title` shown to the patient, a selector in `content`, and the media types the Verifier can read in `accept`. `required` is advice, never consent.
2. A `selection.fhir` selector asks for existing FHIR resources by profile, profile family, or resource type. A `form.fhir` selector asks the patient to fill in a FHIR Questionnaire.
3. The Wallet shows each item and who is asking (the calling page's origin, from the browser).
4. The response has `artifacts`, the shared content, each listing the items it answers in `fulfills`, and `requestStatus`, exactly one status per item. Artifacts are `application/fhir+json` (a resource, a Bundle, or a `QuestionnaireResponse`) or `application/smart-health-card`. One Artifact can answer several items, and one item can have several Artifacts.
5. Each status is `fulfilled`, `partial`, `unavailable`, `declined`, `unsupported`, or `error`. A declined item tells staff what is left to ask at the desk.
6. The Verifier decrypts the response and checks it against the request. Only a malformed response or a wrong `requestId` rejects all of it; other problems affect one item or Artifact.

## Transports

The request and response are the same whichever way they travel.

- **Digital Credentials API, for native wallets.** The Verifier calls `navigator.credentials.get` with protocol `org-iso-mdoc`. The response is one mdoc element holding the whole response JSON, signed by the Wallet and encrypted with HPKE to a one-time key the Verifier made for this request and bound to the calling origin, so only that page can read it. Android wallets register with Credential Manager; on iOS 26 a wallet answers Safari through an Identity Document Provider extension. On a computer, the browser shows a QR code and the patient answers on their phone.
- **Web wallets, in a browser tab.** The Verifier opens the wallet in a new tab; the wallet posts `ready`, the Verifier posts the same request it would give the API, and the wallet posts back the same encrypted response. The wallet takes the Verifier's origin from the browser, never from the message. Nothing to install.
- **Kiosk and cross-device.** A kiosk has no wallet. It builds the request, keeps the private key, and shows a QR code; the patient's phone opens a hand-off page that asks the phone's wallet or a web wallet, and the sealed answer returns through a relay that can't read it. Hand-offs are outside the spec; the client library implements one.

## Status

SMART Health Check-in 1.0 is an editor's draft for implementer review. The project publishes reference implementations, conformance tests, and test apps: a demo web wallet, the SMART Testing Wallet, the SMART Testing EHR, and a reference Android wallet. No health app that patients use today supports it yet. A connectathon is planned; its date isn't set.

## The site

Each section has one llms.txt: this background, then the full text of the section's pages.

- **Home** (https://smart-health-checkin.org/): the home page, this background, and the shared look. https://smart-health-checkin.org/llms.txt
- **Spec** (/spec/): the draft specification, its explainers, and a capture inspector. https://smart-health-checkin.org/spec/llms.txt
- **Developers and Demos** (/client/, /client/demo/): the JavaScript library's guides, API reference, and live demos. https://smart-health-checkin.org/client/llms.txt
- **Connectathon** (/connectathon/): pages for each kind of participant, test scenarios, the Testing EHR and Testing Wallet, and prompts for writing an experience report with an AI assistant. https://smart-health-checkin.org/connectathon/llms.txt

## Repositories and releases

All at https://github.com/smart-health-checkin.

- **spec:** the specification, explainers, fixtures, and conformance cases, tagged `vX.Y.Z`.
- **client:** the JavaScript and TypeScript library `@smart-health-checkin/client`: `runCheckin`, the `<smart-checkin-picker>` element, and a React component for Verifiers, plus modules for web wallets, the kiosk hand-off, FHIR, testing, and the wire format. Install it from a GitHub release's tarball (it isn't on the npm registry) or load hosted ES modules; the Overview at /client/ has the current install line.
- **android-wallet:** the reference Android wallet and an example native Verifier app, which checks in through Credential Manager directly or through the browser in a Custom Tab. Each release carries both APKs.
- **swift:** a Swift package with the Verifier and Wallet roles, installed with Swift Package Manager from tags. There is no reference iOS wallet app yet.
- **connectathon** and **smart-health-checkin.github.io:** the connectathon site, and the home page with the shared look and this background.

## Terms

- **Item:** one entry in a request's `items`: one decision for the patient, one entry in `requestStatus`. Its `content` is the **selector**.
- **Artifact:** one piece of shared content in a response's `artifacts`.
- **Origin:** the calling page's origin as the browser reports it, or for a native app the string its platform reports. The response is bound to it.
- **mdoc:** the ISO/IEC 18013-5 format built for mobile driver's licenses, used here as an envelope. The Wallet signs its own mdoc, so the signatures show the bytes are intact, not who issued the content; that evidence is inside Artifacts, such as a SMART Health Card's signature.
- **Reader authentication:** an optional signature by the Verifier over its request.
- **Wallet registry:** a `wallets.json` file listing the web wallets a Verifier's page offers.
- **FHIR:** HL7's standard format for health data.
- **SMART Health Card:** FHIR data, such as an immunization record, signed by the organization that issued it.
