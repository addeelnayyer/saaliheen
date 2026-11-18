// The tags on the Iltifat and Supplication editors' lists (#143, #271):
// "Marked", once an Iltifat's Marked Words both sides hold a Word or a
// Supplication has a span, and an Iltifat's "Disputed". shadcn/ui's Badge
// (#300), in its marked and disputed variants.

import { Badge } from "@/components/ui/badge";

export const MarkedTag = () => <Badge variant="marked">Marked</Badge>;

export const DisputedTag = () => <Badge variant="disputed">Disputed</Badge>;
