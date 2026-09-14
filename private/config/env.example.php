<?php
// Copy this file to env.php and fill in real values.
// env.php is git-ignored — never commit real secrets.

return [
    'SUPABASE_URL' => 'https://YOUR-PROJECT.supabase.co',
    'SUPABASE_SECRET_KEY' => 'sb_secret_xxx',

    // Confirmed 2026-08-11: this project uses asymmetric JWKS (ES256).
    'SUPABASE_JWT_MODEL' => 'jwks',

    // Not used on the asymmetric model — leave empty.
    'SUPABASE_JWT_SECRET' => '',
];
