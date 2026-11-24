# Player photos and group covers - setup proposal

Approved feature scope November17,2026: one optional photo per player and one optional
cover per group. Existing images can be replaced/removed. No paid user requirement.
Current code has no R2 binding or upload endpoints; R2 account API read returned403,
so bucket existence/billing status could NOT be confirmed. No resources created.

## Isolated setup to approve

Create a PRIVATE development bucket only:

```cmd
npx.cmd wrangler r2 bucket create opencourts-media-dev
```

Cloudflare Pages opencourts -> Settings -> PREVIEW -> Bindings:
R2 binding name PLAY_TOGETHER_MEDIA, bucket opencourts-media-dev.
Do not add a Production binding or enable an R2 public domain/r2.dev endpoint.
Use same-origin Pages Functions for image reads and writes. Production domain remains
unmodified. Need an image transformation binding/service capable of server-side
image decoding/resizing/re-encoding and stripping EXIF, such as Cloudflare Images.
Check account availability/cost and Pages binding support before enabling a service;
if a separate image Worker is needed, prepare it for approval first. Never accept
client-only resizing/metadata stripping as sufficient server validation.

Official reference: https://developers.cloudflare.com/images/tutorials/optimize-user-uploaded-image/

## Implementation contract after setup review

- Accept JPEG/PNG/WebP only, maximum5MB uploaded body; reject SVG, animated images,
  malformed/unsupported files and unreasonable pixel dimensions. Enforce decoded
  dimensions before transform. Avatar512px square, cover1200x600 with crop preview.
- Re-encode server-side to WebP, no EXIF/GPS; store only sanitized output. No original
  uploaded object retained. Display images using fixed aspect ratios and object-fit.
- D1 stores random object keys and current reference/version, not image blobs/URLs.
  Add a new migration after0011; never change applied migrations. One current image
  per player/group. Storage config is dev-only, optional binding fail-closed.
- Upload/delete requires real session, Origin/CSRF and rechecked authorization:
  own player only; group Owner/Co-owner only. Legacy Admins/Organizers/Members cannot
  change group cover. No client-supplied owner or arbitrary object deletion keys.
- Group covers are PUBLIC previews even for private groups. Explicit upload text
  must say this; avoid private addresses/members or schedules in cover captions.
- Player photos inherit profile visibility/member-list permissions; no new public
  player-discovery endpoint. Avoid exposing private profiles by guessed media URLs.
- Random immutable keys for replacements. Only current referenced objects served.
  No persistent browser cache of restricted profile photos. Revalidate group/member
  access on private profile image reads; no public R2 bypass. Group cover public read
  contains only image bytes, no private metadata/identity information.
- Compensate for R2/D1 not sharing a transaction: delete new object on failed reference
  swap, delete replaced object after success, and define orphan cleanup. Account/
  group deletion and removal must clean references safely; never delete other users'
  objects. Race-test replace/delete and role revocation.
- UI: existing theme/design, initials fallback, upload preview, progress/error state,
  replace/remove actions. Photos stay optional and mobile-friendly.
- Tests: spoofed types/body/pixel limits, EXIF stripping, unauthorized writes,
  privacy projections/guessed URLs, revoke access, replacement races and cleanup,
  light/dark/mobile. No fake success when transform/storage binding unavailable.

## Next

Get explicit approval for the bucket command and Preview binding, confirm image
transformation account capability/cost, then implement/test locally and separately
approve migrations/deployment. Existing local group member layout fix is pending
Preview publication and must be preserved. Invites/group games/guests remain next
Phase5 milestones after this small media addition.

## Approved setup attempt - November17,2026
User approved dev bucket creation. Wrangler r2 bucket create opencourts-media-dev failed with Cloudflare code10042: Please enable R2 through the Cloudflare Dashboard. No bucket created, no Preview binding changed. User must activate R2 in account dashboard before retry. Existing creation approval persists for the named development bucket; do not ask again after activation. Server-side transformation capability/cost still needs verification before enabling upload UI.

R2 activation confirmed November17: bucket list succeeded empty; created approved opencourts-media-dev Standard bucket. Added approved Pages PREVIEW binding PLAY_TOGETHER_MEDIA via narrow project PATCH. Verified production R2 binding null, production deployment unchanged7ef38ff2, Preview D1 unchanged. No public bucket access configured, no code deployment or image uploads. New binding takes effect on a subsequent deployment. Server transform setup still pending.

Processor preparation: Pages bindings documentation does not list an Images binding; recommended private service Worker opencourts-media-processor-dev with IMAGES binding, workers_dev=false/preview_urls=false, no storage or D1 access. Local source/config prepared under development/media-processor, NOT deployed. It accepts bounded5MB JPEG/PNG/WebP, checks20MP limit, transforms to512square avatar or1200x600 cover and WebP. Real metadata stripping/animation behavior requires integration validation before uploads ship. Next approve private Worker deployment/service binding and verify Images account availability/billing. Upload routes/UI/D1 references are still unimplemented.

Approved processor setup completed: Worker opencourts-media-processor-dev deployed version a55bc1f7-3b84-4b7e-afd8-4d775b482aa1 with IMAGES. Verified workers_dev and previews both disabled; no routes. Added Pages PREVIEW service binding PLAY_TOGETHER_IMAGE_PROCESSOR targeting that service. Cloudflare service environment field production means the Worker default environment, NOT Pages production: Pages production services remains null, site deployment7ef38ff2 unchanged. R2 Preview binding retained. Binding needs next Pages deployment. Three local mock-binding processor tests passed (size/type/pixels/output settings); actual image re-encoding/metadata stripping has NOT been live verified. No player/group upload endpoints, media schema or UI yet. Next implement authorized media storage/reference routes and controls, test actual processor through private binding before enabling uploads.
## Local upload implementation checkpoint

0012_media_assets.sql applied LOCAL ONLY: current player/group object references,
optimistic versions, cleanup queue and account/group deletion cleanup triggers.
functions/lib/media.ts and /api/media/{player|group}/:id implement GET/PUT/DELETE.
PUT requires MEDIA_UPLOADS_ENABLED=true, private processor and R2 bindings, active
session/Origin/CSRF and rechecked own-player or group Owner/Co-owner authorization.
5MB input cap, bounded processor output, WebP dimensions/metadata/animation inspection
before storage. Stores only transformed bytes, no original. Replacements use version
compare-and-swap; old objects queued for deletion. Deletion trigger queues are drained
on subsequent authorized media writes; no scheduled orphan sweeper is configured yet.
Player photos currently own-account only (no new profile discovery/privacy exposure).
Group cover read is public for active groups. No public R2 URL; current-reference
lookup gates image reads; private no-store headers avoid stale restricted access.

PhotoUpload.tsx adds optional choose/save/replace/remove controls to Account and group
details with local preview and explicit public-cover notice. No media flag enabled
remotely and0012 pending remote. Actual binding transform/EXIF integration unverified;
mock tests cannot establish real sanitization. Need integration test and cleanup race
review before enabling/deploying upload feature. Local member layout fixes bundled.

Initial local checks:16 group/media API tests and3 processor tests passed, including
unauthorized writes, metadata chunk rejection, dimensions, optimized-only replacement
storage and own-only photo reads. Browser/build verification follows in handoff.

Local validation: build/full unit suite passed;17 group/account browser checks plus explicit photo choose/save/remove check passed. No real transform claim: mock binding/API checks only. Pending0012 dev migration/Preview rollout require approval, upload flag remains disabled until live validation.

Latest approved Preview rollout:0012 applied to opencourts-dev only; media/member-layout build d02fb1eb deployed (index-C37aM5Kh.js), stable alias unchanged. MEDIA_UPLOADS_ENABLED remains unset: controls are reviewable but saving photos intentionally unavailable until actual private processor transform/metadata verification. Remote dev migrations0001-0012 applied. Production unchanged/no GitHub push. Next finish real image integration/cleanup validation before enabling uploads, then secure invitations, protected group games and guest capacity.

Photo UI cleanup local: organized compact editor, one styled Choose/Change button, saved versus Unsaved preview distinction, discard, icon placeholders, responsive mobile stacking and explicit public-cover notice. Native file input remains programmatically accessible but not duplicated visually. No enablement change.

Pencil editor update local: photo/cover overlay button opens add/change picker from the image; explicit Save/Discard preview retained. Accessible44px hit area and same styling for both image types. No upload-enable or server changes.

Latest approved UI review build: Preview eb2f943b deployed, stable alias unchanged, index-B47lirXy.js. Includes compact photo editors, add/change pencil overlays, explicit unsaved preview/discard, group location MapPin and earlier member layout fixes. Build/8 group browser tests and photo interaction checks passed. No migrations this rollout; media saving remains disabled (MEDIA_UPLOADS_ENABLED unset) pending live transformation verification. Production unchanged/no GitHub push. Next real processor integration/cleanup checks, then enablement approval and invitations/group games/guests.

Real image verification completed: processor IMAGES.info returns MIME image/jpeg, fixed normalization and regression fixture. Local AND remote Cloudflare Images binding via localhost Wrangler dev tested with2400x1600 JPEG carrying EXIF. Avatar512x512 WebP540bytes, cover1200x600 WebP1372bytes; sharp inspection showed no EXIF/XMP/ICC. No public URL enabled; temporary remote-check config removed.19 media/group API tests passed and app rebuilt. Need approval to redeploy private processor fix, deploy photo UI cleanup and enable MEDIA_UPLOADS_ENABLED=true Preview only. Storage/controller tests remain local; user real saved-photo acceptance after rollout required.

Latest approved media enablement: private processor fix deployed version a55617d2-08b0-404d-8fff-513b240c4de5; MEDIA_UPLOADS_ENABLED=true set on Pages PREVIEW ONLY preserving existing vars; Preview643c7700 published. Stable alias unchanged. Remote dev0012 already applied. Production upload flag absent/deployment7ef38ff2 unchanged; processor no public targets. Real Cloudflare binding resize/metadata checks passed before rollout. User must now test real authenticated photo save/refresh/replace/remove and group Owner/Coowner cover. No fake user account/session created. Cleanup queue currently drained on authorized media writes; no scheduled sweeper. Invitations/group games/guests remain next.

Local header integration: saved player photo replaces account icon across headers; immediate save/remove refresh event, focus refresh, neutral icon fallback, circular object-fit styling. Existing own-photo read authorization retained. Build/browser checks passed; Preview deployment pending approval.


November17 badge/avatar fix LOCAL ONLY: notification link inherited avatar overflow:hidden, clipping count badge. Explicit bell overflow:visible fixes it. Header portrait now object-fit:contain with78% inset inside round frame; player-photo editor contain. Private processor avatar transform preserves full source aspect ratio within512x512 without upscaling (cover output unchanged1200x600). Earlier stored square crops cannot be recovered; re-upload original AFTER processor update deploy. Four processor tests (portrait/landscape/small/cover/privacy bounds) and browser check at320/440/1440 passed; dev build passed. Publish BOTH private development media processor and Pages Preview before asking user to re-upload. No DB migration/resources/production changes needed. Last hosted Preview remains99dbfdcd and processor versiona55617d2.


November17 account photo polish LOCAL: removed nested player-photo card, added compact divider section/portrait frame and understated remove action; pencil offset outside frame. Image now lives in absolutely constrained inner clip wrapper so tall portrait intrinsic sizing cannot overflow the grid and cut off the face. Group editor keeps existing cover treatment. Three upload/pencil/header checks plus two light/dark portrait framing checks at320/393/1280 passed; visual baselines reviewed and dev build passed. Last hosted remains6eec28c4. No migration or processor change needed for this polish; Preview publication pending.


Approved account portrait polish published to https://0b10ef19.opencourts.pages.dev and stable feature alias. Account HTTP200 with index-CJikg5Ua.js verified. Remote dev schema remains0016, processor c5e01912. Production unchanged; no GitHub push. Supersedes local-only portrait editor checkpoint.


November17 header avatar refinement LOCAL: account photo now fills circular header control using object-fit:cover and object-position50%25% (face-focused), instead of78% contain postage-stamp rendering. Full portrait remains contain in profile editor; original asset untouched. Browser badge/avatar check at320/440/1440 passed. Preview publication pending, last hosted0b10ef19.


November17 approved avatar preview alignment LOCAL: player-photo editor is now circular with identical object-fit:cover/object-position50%25% as header avatar, including selected-file preview before saving. Original optimized portrait remains uncropped in storage so framing is presentation-only. Supersedes full-portrait-editor UI decision; group covers unchanged. Local visual tests updated for circular framing. Preview deployment pending; hosted remains0b10ef19.


Approved circular avatar alignment published: https://30bcd70e.opencourts.pages.dev, stable feature alias unchanged. Account HTTP200 with index-DUUW5bWl.js verified. Includes header full-circle face framing and same circular upload preview. Remote dev0016 and processor c5e01912 unchanged; production unchanged. Supersedes local-only avatar notes.


November17 avatar positioning editor implemented: selecting a player photo opens circular draggable preview, Zoom1-3x, horizontal/vertical keyboard-accessible sliders and Reset. Save generates512x512 PNG of chosen framing in browser; existing private processor validates/re-encodes bounded metadata-free WebP. Saved square framing matches header/editor circle. No schema/processor change. This supersedes fixed50%25% as the only framing choice; stored avatar is now the selected crop, so later reframing requires selecting source again. Original local source file is not uploaded/stored. Three existing photo lifecycle checks and two light/dark crop tests passed, including drag/keyboard/zoom and decoded uploaded pixels proving selected blue half was saved,512square. Development build and Preview publication recorded next.


Avatar crop editor published with explicit Preview approval to https://aabb4c22.opencourts.pages.dev and stable feature alias. Account HTTP200 with index-vcxdfgXf.js verified. Five focused photo checks and development build passed. No DB migration, processor deployment, GitHub push or production changes. To test: account pencil -> select original -> drag/use sliders -> Save photo -> header matches.


Crop controls layout fix LOCAL November17: crop preview spans both photo grid columns, but subsequent controls incorrectly fell into96px column. Added explicit cropping state class and full-width controls row, normal-width metadata, aligned save/discard actions and responsive button wrapping. Zoom/drag/crop math unchanged. Two browser crop tests pass at320/440/1280 in both themes with screenshot baselines and exact saved512square pixel check; build passed. Last hosted remainsaabb4c22; layout fix awaiting publication.


Approved crop-controls layout fix deployed to https://795ab8c7.opencourts.pages.dev and stable feature alias. Account HTTP200/index-CaoyvesW.js verified. No migration/processor/production changes. Supersedes local-only crop layout note; pending next product work remains sharing/unlisted games and safety/discovery after user acceptance.


November 22 native iOS continuation (local only): NativeGroupCover.swift implements public group cover display and active Owner/Co-owner system-picker selection, bounded JPEG/PNG/WebP validation, unsaved 2:1 preview, explicit public publish/replace confirmation, discard and confirmed removal using the existing media endpoint. Covers remain public even for private groups; player-photo sharing is separate and unchanged. Fresh group authority is checked before writes; account/scene/error/refresh clear staged data, ambiguous writes require manual refresh/review. Final Xcode build, 588 backend checks (15 new native media cases), native image/role fixtures and read-only simulator selection/preview/cancel/discard pass. Actual saves/removal, races, WebP/HEIC conversion and device/accessibility acceptance remain pending. No image was published or removed, no backend enablement/deployment/migration/settings changes. Full evidence and continuation queue are in ios-app/IOS_APP_HANDOVER.md and IOS_IMPLEMENTATION_WORKLIST.md.
