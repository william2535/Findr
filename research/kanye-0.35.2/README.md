# Kanye portrait — web 0.35.2

The final portrait choice is labelled exactly **Kanye** and uses the bundled public-domain Official White House photo recorded in `public/app/icons/pals/CREDITS.json`. The existing `lovelace` slot ID is retained to preserve saved selections and exports. The original Ada asset/credit remains archived; it is no longer the selected photo. Other icons and colours are unchanged.

Verified: 15 existing helper storage/migration tests passed; production build and public-asset gate passed. The actual Customise menu was opened in Chromium154 at390×844 with a saved legacy selection: Kanye was selected, its local photo rendered, and no horizontal overflow was present. Screenshot was visually checked. New image is included in offline build9124bd9ceb67. No physical iPhone test or new network-disabled run was performed for this image-only change. Android remains0.14.1.
