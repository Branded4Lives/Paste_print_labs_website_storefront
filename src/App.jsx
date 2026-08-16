import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Heart,
  Mail,
  MessageCircle,
  Minus,
  PackageCheck,
  Palette,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Truck,
} from "lucide-react";

import "./App.css";
import heroImage from "./assets/hero-image.png";
import dragonImage from "./assets/pastel-dragon.jpg";

const SHOPIFY_CONFIG = {
  domain: normalizeShopifyDomain(
    import.meta.env.VITE_SHOPIFY_STORE_DOMAIN || "pastel-print-labs-xdgqiy21.myshopify.com",
  ),
  storefrontToken: import.meta.env.VITE_SHOPIFY_STOREFRONT_TOKEN || "",
  apiVersion: import.meta.env.VITE_SHOPIFY_API_VERSION || "2026-07",
};

const CART_STORAGE_KEY = "pastel-print-labs-shopify-cart-id";
const isShopifyConfigured = Boolean(SHOPIFY_CONFIG.domain && SHOPIFY_CONFIG.storefrontToken);

const CART_FRAGMENT = `
  fragment CartFields on Cart {
    id
    checkoutUrl
    totalQuantity
    cost {
      subtotalAmount {
        amount
        currencyCode
      }
      totalAmount {
        amount
        currencyCode
      }
    }
    lines(first: 50) {
      edges {
        node {
          id
          quantity
          cost {
            totalAmount {
              amount
              currencyCode
            }
          }
          merchandise {
            ... on ProductVariant {
              id
              title
              availableForSale
              selectedOptions {
                name
                value
              }
              image {
                url
                altText
                width
                height
              }
              product {
                id
                title
                handle
              }
            }
          }
        }
      }
    }
  }
`;

const PRODUCTS_QUERY = `
  query Products($first: Int!) {
    products(first: $first, sortKey: CREATED_AT, reverse: true) {
      edges {
        node {
          id
          title
          handle
          description
          availableForSale
          tags
          featuredImage {
            url
            altText
            width
            height
          }
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
            maxVariantPrice {
              amount
              currencyCode
            }
          }
          options {
            name
            values
          }
          variants(first: 20) {
            edges {
              node {
                id
                title
                availableForSale
                price {
                  amount
                  currencyCode
                }
                image {
                  url
                  altText
                  width
                  height
                }
                selectedOptions {
                  name
                  value
                }
              }
            }
          }
        }
      }
    }
  }
`;

const CART_QUERY = `
  ${CART_FRAGMENT}
  query Cart($id: ID!) {
    cart(id: $id) {
      ...CartFields
    }
  }
`;

const CART_CREATE_MUTATION = `
  ${CART_FRAGMENT}
  mutation CartCreate($input: CartInput!) {
    cartCreate(input: $input) {
      cart {
        ...CartFields
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const CART_LINES_ADD_MUTATION = `
  ${CART_FRAGMENT}
  mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart {
        ...CartFields
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const CART_LINES_UPDATE_MUTATION = `
  ${CART_FRAGMENT}
  mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
      cart {
        ...CartFields
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const CART_LINES_REMOVE_MUTATION = `
  ${CART_FRAGMENT}
  mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
      cart {
        ...CartFields
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const sampleProducts = [
  {
    id: "sample-dragon",
    title: "Pastel Dragon",
    priceLabel: "$18",
    tag: "Signature",
    image: { url: dragonImage, altText: "Pastel Dragon" },
    description: "A flexible rainbow dragon with a smooth, articulated body.",
    colors: ["Mint", "Sky", "Blush"],
    availableForSale: true,
    defaultVariantId: "",
  },
  {
    id: "sample-mini",
    title: "Mystery Mini",
    priceLabel: "$8",
    tag: "Giftable",
    visual: "mini",
    description: "A small surprise character printed in soft seasonal colors.",
    colors: ["Lavender", "Peach", "Cream"],
    availableForSale: true,
    defaultVariantId: "",
  },
  {
    id: "sample-sign",
    title: "Custom Name Sign",
    priceLabel: "$25",
    tag: "Custom",
    visual: "sign",
    description: "A shelf-ready name sign with gentle shapes and polished detail.",
    colors: ["Pink", "Lilac", "White"],
    availableForSale: true,
    defaultVariantId: "",
  },
  {
    id: "sample-decor",
    title: "Desk Decor Set",
    priceLabel: "$14",
    tag: "Studio",
    visual: "decor",
    description: "Small organizers, charms, and cheerful pieces for a softer desk.",
    colors: ["Sage", "Lemon", "Lilac"],
    availableForSale: true,
    defaultVariantId: "",
  },
];

const processSteps = [
  {
    icon: Palette,
    title: "Color-led",
    text: "Pastel palettes, soft gradients, and custom combinations are selected before every print.",
  },
  {
    icon: Sparkles,
    title: "Finished by hand",
    text: "Each piece is checked for surface quality, movement, and gift-ready detail.",
  },
  {
    icon: PackageCheck,
    title: "Ready to send",
    text: "Checkout stays simple while the studio handles packing, timing, and care.",
  },
];

const trustPoints = [
  { icon: CheckCircle2, label: "Hand finished" },
  { icon: ShieldCheck, label: "Quality checked" },
  { icon: Truck, label: "Packed safely" },
];

const heroStats = [
  ["01", "Custom colorways"],
  ["02", "Secure checkout"],
  ["03", "Small-batch finish"],
];

export default function App() {
  const [products, setProducts] = useState(sampleProducts);
  const [productsStatus, setProductsStatus] = useState("loading");
  const [productsError, setProductsError] = useState("");
  const [cart, setCart] = useState(null);
  const [cartStatus, setCartStatus] = useState("");
  const [cartError, setCartError] = useState("");
  const [formStatus, setFormStatus] = useState("");

  const cartLines = useMemo(() => cart?.lines?.edges?.map((edge) => edge.node) || [], [cart]);
  const cartItems = cart?.totalQuantity || 0;
  const cartTotal = cart?.cost?.subtotalAmount ? formatMoney(cart.cost.subtotalAmount) : "$0";

  useEffect(() => {
    let isCancelled = false;

    async function loadProducts() {
      if (!isShopifyConfigured) {
        setProducts(sampleProducts);
        setProductsStatus("idle");
        setProductsError("The live shop is being connected. Browse the preview collection for now.");
        return;
      }

      setProductsStatus("loading");
      setProductsError("");

      try {
        const data = await shopifyFetch(PRODUCTS_QUERY, { first: 12 });
        const liveProducts = data.products.edges.map((edge) => mapShopifyProduct(edge.node));

        if (!isCancelled) {
          setProducts(liveProducts.length ? liveProducts : sampleProducts);
          setProductsStatus("ready");
          setProductsError(liveProducts.length ? "" : "The next collection is not published yet.");
        }
      } catch (error) {
        if (!isCancelled) {
          setProducts(sampleProducts);
          setProductsStatus("error");
          setProductsError(error.message);
        }
      }
    }

    loadProducts();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;

    async function loadCart() {
      if (!isShopifyConfigured) return;

      const savedCartId = window.localStorage.getItem(CART_STORAGE_KEY);
      if (!savedCartId) return;

      try {
        const data = await shopifyFetch(CART_QUERY, { id: savedCartId });

        if (isCancelled) return;

        if (data.cart) {
          setCart(data.cart);
        } else {
          window.localStorage.removeItem(CART_STORAGE_KEY);
        }
      } catch {
        if (!isCancelled) {
          window.localStorage.removeItem(CART_STORAGE_KEY);
        }
      }
    }

    loadCart();

    return () => {
      isCancelled = true;
    };
  }, []);

  async function addToCart(product) {
    setCartError("");

    if (!isShopifyConfigured) {
      setCartError("Live checkout is being connected.");
      return;
    }

    if (!product.defaultVariantId) {
      setCartError(`${product.title} is not ready for checkout yet.`);
      return;
    }

    setCartStatus(product.id);

    try {
      const variables = cart?.id
        ? {
            cartId: cart.id,
            lines: [{ merchandiseId: product.defaultVariantId, quantity: 1 }],
          }
        : {
            input: {
              lines: [{ merchandiseId: product.defaultVariantId, quantity: 1 }],
            },
          };

      const data = await shopifyFetch(
        cart?.id ? CART_LINES_ADD_MUTATION : CART_CREATE_MUTATION,
        variables,
      );
      const nextCart = getCartFromPayload(data, cart?.id ? "cartLinesAdd" : "cartCreate");

      setCart(nextCart);
      window.localStorage.setItem(CART_STORAGE_KEY, nextCart.id);
    } catch (error) {
      setCartError(error.message);
    } finally {
      setCartStatus("");
    }
  }

  async function updateCartLine(lineId, quantity) {
    if (!cart?.id) return;

    if (quantity <= 0) {
      await removeCartLine(lineId);
      return;
    }

    setCartStatus(lineId);
    setCartError("");

    try {
      const data = await shopifyFetch(CART_LINES_UPDATE_MUTATION, {
        cartId: cart.id,
        lines: [{ id: lineId, quantity }],
      });

      setCart(getCartFromPayload(data, "cartLinesUpdate"));
    } catch (error) {
      setCartError(error.message);
    } finally {
      setCartStatus("");
    }
  }

  async function removeCartLine(lineId) {
    if (!cart?.id) return;

    setCartStatus(lineId);
    setCartError("");

    try {
      const data = await shopifyFetch(CART_LINES_REMOVE_MUTATION, {
        cartId: cart.id,
        lineIds: [lineId],
      });
      const nextCart = getCartFromPayload(data, "cartLinesRemove");

      setCart(nextCart);

      if (!nextCart.totalQuantity) {
        window.localStorage.removeItem(CART_STORAGE_KEY);
      }
    } catch (error) {
      setCartError(error.message);
    } finally {
      setCartStatus("");
    }
  }

  function handleCheckout() {
    if (cart?.checkoutUrl) {
      window.location.href = cart.checkoutUrl;
    }
  }

  function handleCustomSubmit(event) {
    event.preventDefault();
    setFormStatus("Thanks. Your custom idea is ready to review.");
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Pastel Print Labs home">
          <span className="brand__mark">
            <Sparkles size={18} aria-hidden="true" />
          </span>
          <span>
            <strong>Pastel Print Labs</strong>
            <small>Custom 3D print studio</small>
          </span>
        </a>

        <nav className="site-nav" aria-label="Main navigation">
          <a href="#shop">Shop</a>
          <a href="#custom">Custom</a>
          <a href="#process">Process</a>
        </nav>

        <a className="cart-pill" href="#cart" aria-label={`${cartItems} cart items`}>
          <ShoppingBag size={18} aria-hidden="true" />
          <span>{cartItems}</span>
        </a>
      </header>

      <main id="top">
        <section className="hero" aria-label="Pastel Print Labs">
          <div className="hero__image" aria-hidden="true">
            <img src={heroImage} alt="" />
          </div>
          <div className="hero__shade" aria-hidden="true" />

          <div className="hero__content">
            <p className="eyebrow">Small-batch objects, softly made</p>
            <h1>Pastel Print Labs</h1>
            <p className="hero__lead">
              A small 3D print studio creating pastel creatures, name signs, and desk pieces
              that feel made for the person receiving them.
            </p>

            <div className="hero__actions">
              <a className="button button--primary" href="#shop">
                <ShoppingBag size={18} aria-hidden="true" />
                Shop the studio
              </a>
              <a className="button button--secondary" href="#custom">
                Start a custom piece
                <ArrowRight size={18} aria-hidden="true" />
              </a>
            </div>

            <div className="hero__stats" aria-label="Storefront highlights">
              {heroStats.map(([number, label]) => (
                <span key={label}>
                  <strong>{number}</strong>
                  {label}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="studio-intro" aria-label="Studio overview">
          <div>
            <p className="section-label">Studio</p>
            <h2>Made to feel personal before it ever reaches checkout.</h2>
          </div>
          <p>
            The storefront keeps the customer path simple: browse a focused collection,
            add a piece to the bag, or send a custom brief when the idea needs
            a more human touch.
          </p>
        </section>

        <section className="section shop-section" id="shop">
          <div className="section__header">
            <div>
              <p className="section-label">Shop</p>
              <h2>Ready-to-print favorites.</h2>
              <p>A focused collection of giftable pieces, finished in soft color and made in small batches.</p>
            </div>
            <a className="cart-summary" href="#cart" aria-live="polite">
              <ShoppingBag size={18} aria-hidden="true" />
              <span>
                {cartItems
                  ? `${cartItems} item${cartItems === 1 ? "" : "s"} - ${cartTotal}`
                  : "Cart is empty"}
              </span>
            </a>
          </div>

          {productsError && (
            <p className={`shop-notice shop-notice--${productsStatus === "error" ? "error" : "info"}`}>
              {productsError}
            </p>
          )}

          <div className="shop-layout">
            <div className="product-grid">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  quantity={getProductQuantity(cartLines, product.id)}
                  isAdding={cartStatus === product.id}
                  isConfigured={isShopifyConfigured}
                  onAdd={() => addToCart(product)}
                />
              ))}
            </div>

            <CartPanel
              cartError={cartError}
              cartLines={cartLines}
              cartStatus={cartStatus}
              cartTotal={cartTotal}
              hasCheckout={Boolean(cart?.checkoutUrl)}
              isConfigured={isShopifyConfigured}
              onCheckout={handleCheckout}
              onRemove={removeCartLine}
              onUpdate={updateCartLine}
            />
          </div>
        </section>

        <section className="process-band" id="process" aria-label="Order process">
          {processSteps.map((step) => {
            const Icon = step.icon;

            return (
              <article className="process-step" key={step.title}>
                <Icon size={22} aria-hidden="true" />
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            );
          })}
        </section>

        <section className="section custom-section" id="custom">
          <div className="custom-copy">
            <p className="section-label">Custom orders</p>
            <h2>Have a specific gift in mind?</h2>
            <p>
              Share the idea, name, colors, and size. The form keeps the first step
              quick so a quote can start without making the customer work too hard.
            </p>
            <div className="trust-list">
              {trustPoints.map((point) => {
                const Icon = point.icon;

                return (
                  <span key={point.label}>
                    <Icon size={17} aria-hidden="true" />
                    {point.label}
                  </span>
                );
              })}
            </div>
          </div>

          <form className="custom-form" onSubmit={handleCustomSubmit}>
            <label>
              What should we make?
              <textarea
                name="idea"
                placeholder="Example: a lavender name sign that says Emma with stars"
                required
              />
            </label>

            <div className="form-grid">
              <label>
                Color mood
                <select name="colorMood" defaultValue="pastel-rainbow">
                  <option value="pastel-rainbow">Pastel rainbow</option>
                  <option value="pink-purple">Pink and purple</option>
                  <option value="mint-blue">Mint and blue</option>
                  <option value="not-sure">Not sure yet</option>
                </select>
              </label>
              <label>
                Email
                <input name="email" type="email" placeholder="you@example.com" required />
              </label>
            </div>

            <button className="button button--primary" type="submit">
              <Mail size={18} aria-hidden="true" />
              Request a quote
            </button>
            {formStatus && <p className="form-status">{formStatus}</p>}
          </form>
        </section>

        <section className="contact-band" id="contact">
          <div>
            <p className="section-label">Ready</p>
            <h2>Shop the latest pieces or start with a custom idea.</h2>
          </div>
          <a className="button button--secondary" href="#custom">
            <MessageCircle size={18} aria-hidden="true" />
            Send a request
          </a>
        </section>
      </main>
    </div>
  );
}

async function shopifyFetch(query, variables = {}) {
  const endpoint = `https://${SHOPIFY_CONFIG.domain}/api/${SHOPIFY_CONFIG.apiVersion}/graphql.json`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": SHOPIFY_CONFIG.storefrontToken,
    },
    body: JSON.stringify({ query, variables }),
  });
  const payload = await response.json();

  if (!response.ok || payload.errors?.length) {
    throw new Error(payload.errors?.map((error) => error.message).join(" ") || "The shop could not load right now.");
  }

  return payload.data;
}

function getCartFromPayload(data, key) {
  const payload = data[key];

  if (payload.userErrors?.length) {
    throw new Error(payload.userErrors.map((error) => error.message).join(" "));
  }

  return payload.cart;
}

function mapShopifyProduct(product) {
  const variants = product.variants.edges.map((edge) => edge.node);
  const defaultVariant = variants.find((variant) => variant.availableForSale) || variants[0];
  const optionValues = product.options.flatMap((option) => option.values).slice(0, 4);

  return {
    id: product.id,
    title: product.title,
    description: product.description,
    availableForSale: product.availableForSale,
    defaultVariantId: defaultVariant?.id || "",
    image: product.featuredImage || defaultVariant?.image || null,
    priceLabel: formatPriceRange(product.priceRange),
    tag: product.availableForSale ? product.tags[0] || "Ready" : "Sold out",
    colors: optionValues.length ? optionValues : ["Pastel", "Custom", "Gift-ready"],
  };
}

function formatPriceRange(priceRange) {
  const min = formatMoney(priceRange.minVariantPrice);
  const max = formatMoney(priceRange.maxVariantPrice);

  return min === max ? min : `From ${min}`;
}

function formatMoney(money) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: money.currencyCode,
  }).format(Number(money.amount));
}

function normalizeShopifyDomain(domain) {
  return domain.replace(/^https?:\/\//, "").replace(/\/$/, "").trim();
}

function getProductQuantity(cartLines, productId) {
  return cartLines.reduce((total, line) => {
    if (line.merchandise?.product?.id === productId) {
      return total + line.quantity;
    }

    return total;
  }, 0);
}

function CartPanel({
  cartError,
  cartLines,
  cartStatus,
  cartTotal,
  hasCheckout,
  isConfigured,
  onCheckout,
  onRemove,
  onUpdate,
}) {
  return (
    <aside className="cart-panel" id="cart" aria-label="Shopping cart">
      <div className="cart-panel__header">
        <div>
          <p className="section-label">Cart</p>
          <h2>Studio bag</h2>
        </div>
        <strong>{cartTotal}</strong>
      </div>

      <p className="cart-panel__note">
        {isConfigured ? "Secure checkout and order updates are handled end to end." : "Checkout is opening soon."}
      </p>

      {cartError && <p className="shop-notice shop-notice--error">{cartError}</p>}

      {cartLines.length > 0 ? (
        <>
          <div className="cart-lines">
            {cartLines.map((line) => (
              <article className="cart-line" key={line.id}>
                <div className="cart-line__image">
                  {line.merchandise?.image ? (
                    <img
                      src={line.merchandise.image.url}
                      alt={line.merchandise.image.altText || line.merchandise.product.title}
                    />
                  ) : (
                    <ShoppingBag size={28} aria-hidden="true" />
                  )}
                </div>
                <div>
                  <h3>{line.merchandise?.product?.title}</h3>
                  {line.merchandise?.title !== "Default Title" && <p>{line.merchandise?.title}</p>}
                  <strong>{formatMoney(line.cost.totalAmount)}</strong>
                </div>
                <div className="cart-line__controls">
                  <button
                    className="icon-button"
                    disabled={cartStatus === line.id}
                    onClick={() => onUpdate(line.id, line.quantity - 1)}
                    type="button"
                    aria-label={`Decrease ${line.merchandise?.product?.title}`}
                  >
                    <Minus size={16} aria-hidden="true" />
                  </button>
                  <span>{line.quantity}</span>
                  <button
                    className="icon-button"
                    disabled={cartStatus === line.id}
                    onClick={() => onUpdate(line.id, line.quantity + 1)}
                    type="button"
                    aria-label={`Increase ${line.merchandise?.product?.title}`}
                  >
                    <Plus size={16} aria-hidden="true" />
                  </button>
                  <button
                    className="text-button"
                    disabled={cartStatus === line.id}
                    onClick={() => onRemove(line.id)}
                    type="button"
                  >
                    Remove
                  </button>
                </div>
              </article>
            ))}
          </div>

          <button className="button button--primary checkout-button" onClick={onCheckout} disabled={!hasCheckout}>
            <ShoppingBag size={18} aria-hidden="true" />
            Checkout securely
          </button>
        </>
      ) : (
        <p className="cart-panel__empty">A quieter cart, ready when the customer is.</p>
      )}
    </aside>
  );
}

function ProductCard({ product, quantity, isAdding, isConfigured, onAdd }) {
  const canAdd = isConfigured && product.availableForSale && product.defaultVariantId;

  return (
    <article className="product-card">
      <div className="product-card__media">
        {product.image ? (
          <img src={product.image.url} alt={product.image.altText || product.title} />
        ) : (
          <ProductVisual type={product.visual} />
        )}
        <span className="product-tag">{product.tag}</span>
      </div>

      <div className="product-card__body">
        <div>
          <div className="product-card__title-row">
            <h3>{product.title}</h3>
            <strong>{product.priceLabel}</strong>
          </div>
          <p>{product.description}</p>
        </div>

        <div className="color-list" aria-label={`${product.title} options`}>
          {product.colors.map((color) => (
            <span key={color}>{color}</span>
          ))}
        </div>

        <button className="button button--add" disabled={!canAdd || isAdding} onClick={onAdd} type="button">
          <Plus size={18} aria-hidden="true" />
          {buttonLabel({ canAdd, isAdding, quantity, product })}
        </button>
      </div>
    </article>
  );
}

function buttonLabel({ canAdd, isAdding, quantity, product }) {
  if (!canAdd) {
    return product.availableForSale ? "Preview item" : "Sold out";
  }

  if (isAdding) return "Adding...";

  return quantity > 0 ? `${quantity} in cart` : "Add to cart";
}

function ProductVisual({ type }) {
  if (type === "sign") {
    return (
      <div className="sample-visual sample-visual--sign" aria-hidden="true">
        <span>Emma</span>
      </div>
    );
  }

  if (type === "decor") {
    return (
      <div className="sample-visual sample-visual--decor" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    );
  }

  return (
    <div className="sample-visual sample-visual--mini" aria-hidden="true">
      <Heart size={42} />
    </div>
  );
}
