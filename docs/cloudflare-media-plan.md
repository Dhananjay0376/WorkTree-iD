# Cloudflare Media Access Follow-Up

## Goal
Allow collaborators to view project media without relying on the current Firebase Storage access pattern that effectively pushes the app toward Blaze-plan-only behavior for shared media.

## Current State
- Project metadata and collaboration state now live in Firestore.
- Media nodes remain intentionally owner-visible-only in the tree view.
- The current upload path uses Firebase Storage URLs attached directly to project nodes.

## Proposed Next Phase
1. Keep project metadata in Firestore.
2. Move collaborator-visible media delivery to a Cloudflare-backed path.
3. Store Cloudflare-deliverable media URLs or signed access metadata on media nodes instead of relying on owner-only Firebase Storage access.
4. Preserve the current project permission model:
   - owners and editors can manage media nodes
   - viewers and collaborators can only consume media they are permitted to view

## Suggested Implementation Shape
- Upload media to a Cloudflare-supported storage/delivery layer.
- Persist media metadata on nodes:
  - asset id
  - delivery URL
  - optional signed-access or tokenized access metadata
- Keep Firestore as the source of truth for:
  - project ownership
  - collaborators
  - node structure
  - media references

## Constraints to Respect
- Do not weaken current project privacy rules.
- Do not make media delivery a blocker for existing text/tree collaboration.
- Keep owner-only media visibility in place until the Cloudflare path is complete.

## Acceptance Criteria for That Future Phase
- An invited collaborator can open a project and view permitted media nodes.
- Unauthorized users still cannot access private project media.
- Media delivery works without requiring the current Firebase Storage workaround.
