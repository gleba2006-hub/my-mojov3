<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules

- Education methods are plugins under `src/methods/<id>/`, registered once in `src/methods/registry.ts`; core code must never branch on a method id, so adding a method stays a one-folder change.
- RLS helper functions live in the non-exposed `app_private` schema (not `public`), so they cannot be called directly through the data API.
- Roles live only in `public.user_roles` and are checked via `app_private.has_role`, never stored on profiles — prevents privilege escalation.
- All UI text is Hebrew and the app renders RTL from `__root.tsx`; colors/fonts come from tokens in `src/styles.css` only.
