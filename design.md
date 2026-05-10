# Modal Design System

To maintain a premium and consistent user experience across the Trip Planner, all modals (Dialogs) must adhere to these structural and aesthetic rules.

## 1. General Structure
- **Width**: Use `max-w-md` for simple confirmations (Delete, Alert) and `max-w-3xl` for complex data entry (Add/Edit Activity).
- **Radius**: Always use `rounded-[32px]` or `rounded-[24px]` for a soft, premium feel.
- **Shadow**: Use `shadow-2xl` for depth.
- **Components**: Strictly use Shadcn/UI sub-components: `DialogHeader`, `DialogTitle`, `DialogDescription`, and `DialogFooter`.

## 2. Header & Footer
- **Padding**: Use `p-8` for generous breathing room.
- **Typography**: Titles should be `font-bold` and `tracking-tight`. Descriptions should be `text-zinc-400`.
- **Footer**: Always place primary actions on the right, with a clear `gap-3` between buttons.

## 3. Body & Content
- **Layout**: For complex forms, use a single-column **Vertical Flow** to ensure focus.
- **Spacing**: Use `space-y-8` between major sections to prevent a "shrinked" or crowded feel.
- **Inputs**: Use large, accessible inputs with `h-12` or `h-14` height and clear labels in `uppercase tracking-widest` style.

## 4. Media & Attachments
- **Placement**: Place the Media/Attachment section at the top of the body for high visibility.
- **Grid**: Use a clear grid for images with `aspect-square` or `aspect-video` and a dedicated `ScrollArea` if many files are expected.

## 5. Deletion Flow
- **Focus**: Keep it centered, small (`max-w-sm`), and high-contrast (red accents for destructive actions).
- **Iconography**: Use a prominent `Trash2` icon in a `bg-red-50` container.
