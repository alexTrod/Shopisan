test

## Data safety: trash + backups

**Trash (soft delete).** Deleting a store — from the app (owner) or the admin panel — only sets
`deleted_at` / `deleted_by` on the document. The store disappears from the app immediately but
stays in Firestore; admins restore it from **Stores → Trash**. The scheduled function
`purgeTrashedStores` hard-deletes stores (posts + Cloudflare images) 30 days after `deleted_at`.
Photos removed in the admin **Photos** page move to `deleted_images[]` on the store/post and can be
restored from there.

**Backups (whole-database export).** One-time setup, run by a project owner:

```bash
gcloud config set project shopisan-bad76
gsutil mb -l europe-west1 gs://shopisan-bad76-firestore-backups
gsutil lifecycle set <(echo '{"rule":[{"action":{"type":"Delete"},"condition":{"age":60}}]}') \
  gs://shopisan-bad76-firestore-backups
gcloud firestore backups schedules create --database='(default)' --recurrence=daily --retention=14d
```

The last command uses Firestore's managed daily backups (14-day retention, restorable with
`gcloud firestore databases restore`). The bucket is for ad-hoc exports:
`gcloud firestore export gs://shopisan-bad76-firestore-backups/$(date +%F)`.
