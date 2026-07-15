---
applyTo: "**/{app,components,store}/**/*.{html,css,scss,js,jsx,ts,tsx}"
description: "Use when editing Next.js App Router UI code. Covers accessibility, responsiveness, state boundaries, and admin interaction quality."
---

# Frontend Instructions

Apply these rules when working on user-facing interfaces.

- Build responsive layouts that work on desktop and mobile.
- Prefer semantic HTML and accessible component structure.
- Ensure keyboard navigation and visible focus states for interactive elements.
- Use descriptive labels and text for controls and forms.
- Add meaningful `alt` text for informative images and `alt=""` for decorative images.
- Avoid layout shifts, unnecessary re-renders, and heavy client-side work when simpler options exist.
- Keep styling consistent with the established design language once the project has one.
- For role-based screens, hide unavailable actions in UI, but do not treat UI hiding as authorization.
- Keep table filters, totals, and export criteria visually and behaviorally aligned.
- Forms used for student, recharge, and sign workflows must expose validation errors clearly and accessibly.
- Prefer server components for static or data-read sections and client components only where interaction/state is required.
- For Ant Design forms and tables, avoid uncontrolled rerender loops and keep expensive computations memoized.

Adjust applyTo only if the project introduces new UI roots beyond app, components, or store.