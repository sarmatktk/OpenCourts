## Latest review: waitlist polish (local, November 18)

Supersedes analytics and ownership-transfer descriptions below: Account and Play Together routes now skip Google tag loading. Court-page analytics initialization strips query/fragment and suppresses referrer. Automated checks verify no community tag request and sanitized court configuration. Existing analytics cookies from court visits can still exist; no consent manager or general retention job was introduced. Server and public deletion copy now requires archiving owned groups. Private waitlist responses require current group membership; host queue requires existing management permission. Privacy notice and help updated to reflect implementation, not legal certification. Real-device/assistive technology and jurisdiction/operator decisions remain outstanding.

# Privacy and information-page review - November 18, 2026

## Scope and evidence
Read the latest PLAY_TOGETHER_HANDOFF.md, central reference and authentication/media/sharing-safety documentation, then checked current implementations in functions/lib/auth.ts, media.ts, players.ts, game participation/invitation code, schema relationships, src/App.tsx/services.ts, index.html and static theme/page styles. Older phase notes are historical, not the current product contract.

Updated public/privacy.html, about.html, contact.html and support.html; added play-together-help.html and links in related static footers and the community shell. Reused pages.css/theme.js and existing tokens; no framework, identity/permission change, payment implementation or production configuration change.

## Important corrections
- Privacy now covers community accounts/provider emails and identifiers, Google/Apple sign-in and explicit linking, seven-day sessions, profile discovery off by default, group previews and private content, public/unlisted/group game audiences, membership roles, requests/guest counts/cancellation reasons, notifications, blocks/reports and moderators.
- Avatar endpoint currently restricts reads to the account holder. Group covers are publicly readable for active groups, including private groups. Image metadata/dimension checks exist; storage cleanup is queued and not instantaneous. No promise that visible image content is anonymized.
- Exact court coordinates/manual court addresses are stored game snapshots, separate from general profile location. Device location is requested on an explicit action and can be remembered as the last browser search. Location actions do not automatically populate profile addresses.
- Analytics is loaded by index.html on React community routes as well as court discovery. Static information pages do not add this Google tag. No consent manager is present. Do not claim analytics is cookie-free, restricted to courts, or opted out by default. URLs can carry unlisted invite tokens; the notice discloses page-URL processing rather than falsely claiming complete confidentiality.
- Deletion requires recent sign-in, owned-group transfer/archive and Apple revocation where applicable; cascades delete linked data. Other users' activities are not universally erased. Report retention is not guaranteed independent of relational deletion. No immediate universal backup deletion promise.
- No universal inactive-account/game/report retention job exists. Do not invent exact data-retention durations, regulated-rights completion timelines, guaranteed moderation response times, data-region guarantees or legal compliance certifications.
- Preview status and separation from live court production are explicit. Free first release and optional external contributions are distinguished from future payments/recurrence/native iOS work.

## Operational follow-ups before a public production release
These are open items, not implemented or resolved by editing a notice:
- Establish and document inactive-account/history/report/log/media-cleanup and backup retention/deletion policies with the operator and actual hosting settings.
- Review analytics consent requirements for intended launch regions and sanitize sensitive query parameters (especially invitation tokens) before analytics page-view collection. Current URL exposure is disclosed; disclosure alone does not establish regulatory compliance or remove the exposure.
- Confirm operator/contact details and intended age/audience policy; no age-verification or parental-consent workflow is implemented. General-audience wording is not a COPPA compliance claim.
- Confirm provider agreements, hosting regions, security/log retention and applicable jurisdictional rights before making corresponding promises. Support email is the existing public contact.
- Exercise deletion including Apple revocation and failed media cleanup; physical mobile/assistive-technology review remains needed. Keep provider readiness checks in preview release workflow.

## Validation
Eight browser cases each visit all five information pages at 320/390/768/1440 in light/dark, checking theme, viewport overflow, visible headings, help links and privacy section anchors/content. Development build and whitespace checks passed. Content is an evidence-based draft for this product; legal/jurisdictional conclusions are not represented as validated.
