import { redirect } from "next/navigation";

/**
 * The checkout root has no session id — a checkout session is always created
 * from the cart (create_checkout) and deep-linked. Redirect to the cart.
 */
export default function CheckoutRootPage() {
  redirect("/cart");
}
