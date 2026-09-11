# Storefront route contract

This document defines the structure and data flow of every non-admin route. It
answers which blocks a route contains, their order, which side of the React
Server Component boundary owns them, and which procedure feeds them.

`DESIGN.md` is the only authority for appearance. Route builders choose markup
and user-facing Brazilian Portuguese copy within that visual system. Components
contain render logic only; parsing, validation, formatting, state transitions,
and domain rules stay in their owning helpers, hooks, or modules.

## Cross-cutting contract

### Scope and frames

The Storefront is all 20 non-admin routes across `(shop)`, `(auth)`, and
`(account)`. It is not a synonym for the `(shop)` route group.

The `(shop)` and `(account)` layouts mount the shared Storefront header and
footer from `components/shop/`. The header is a Server Component containing the
wordmark; links to `/produtos` and every root Category; the client search leaf;
the static `/carrinho` link with its client Cart badge; and the client account
menu. The footer is a Server Component containing Loja links from the same root
Categories, links to the five institucional routes, shared contact facts, the
wordmark, and copyright. It contains no newsletter, payment-method list, or
social-media list.

`modules/categories/shop.ts` wraps
`caller.categories.shop.roots()` in React `cache()`. The header and footer call
that function directly, so the render performs one database query without a
layout prop-drilling the rows. The same procedure returns root Category name,
slug, and optional picture and sorts names with `localeCompare(…, "pt-BR")`.

The `(shop)` layout never reads a session. Nothing inside a cached shop route
may vary by visitor on the server. `account-menu.tsx` uses
`authClient.useSession()`. `cart-badge.tsx` enables a cold
`useQuery(trpc.cart.get.queryOptions())` only for a signed-in User, selects
`totalQuantity`, and renders no count until a non-zero result exists. It shares
the Cart query key with `/carrinho`; there is no separate count procedure.

The search leaf submits `/produtos?busca=<term>` with `useRouter().push`. It is
uncontrolled and does not call `useSearchParams()`, which would move part of
every prerendered route into client rendering. Root navigation has no dropdown
or active-route state.

The `(auth)` layout is a separate credential frame. It contains one Hertz Lab
identity link to `/`, the route content, and shared loading and recoverable
error boundaries. It does not mount the Storefront frame or sign-out.

The `(account)` layout adds route-group navigation for Pedidos, Favoritos,
Endereços, and Perfil between the shared header and footer. The smallest client
leaf reads selected layout segments; an Order detail keeps Pedidos active. The
layout performs no authorization read. Every account page calls `requireUser()`
for itself.

### Procedures and read paths

Shop procedures mirror the module surface: two-audience modules use
`trpc.<module>.shop.<procedure>`, while Storefront-only modules such as `cart`,
`wishlist`, `checkout`, and `payments` stay flat. Public catalogue reads use
`baseProcedure`; visitor-owned reads use `protectedProcedure` and derive the
User from the session. A shopper addresses Products and Categories by Slug.

Every public URL input is parsed once by the page through a lenient schema.
Code keys remain English and map explicitly to Brazilian Portuguese URL keys.
The normalized object is both the procedure input and, when a client consumes
the query, the prop that preserves the server/client query key.

The read helper is selected per query:

- `caller` serves data rendered only by Server Components. It ships no
  dehydrated query cache and is the Storefront default.
- An unawaited `prefetch` plus `<HydrateClient>` serves a query read by a Client
  Component when a shopper write can invalidate it. The client reads it with
  `useSuspenseQuery` beneath a page-owned `<Suspense>` boundary.
- `load` is reserved for one query whose value is required by both the Server
  Component and a Client Component. None of the current route contracts needs
  it.
- A cold client `useQuery` is used for visitor-specific state inside a cached
  route. It is session-gated and is neither prefetched nor hydrated.

Shopper writes are tRPC mutations except Better Auth operations. A mutation
hook owns invalidation and success feedback; components own navigation. A write
invalidates its module path, plus another module only when it demonstrably
changes that module's data. `router.refresh()` is needed only when a Server
Component rendered data that changed.

### Rendering, waiting, and absence

`cacheComponents` is off. A Request-time read makes the whole route dynamic;
`<Suspense>` provides streaming, not a static shell. Static routes cache the
rendered route through ISR and have no time-based revalidation floor. Admin and
commerce writes invalidate `/` and literal `/produto/<slug>` paths according to
ADR-0036 and ADR-0047. A Category write invalidates the whole `(shop)` layout,
because the frame renders the root Categories on every route beneath it.

A dynamic segment with prefetched data uses a page-owned `<Suspense>` boundary.
A dynamic segment that awaits all of its data owns `loading.tsx`. A static
segment uses neither. Group-level `error.tsx` files belong to `(shop)` and
`(account)`; there is no per-section shop error boundary.

A path addresses a resource: a missing addressed value becomes `notFound()`.
A query string describes a view: no matches produce an empty state. A
`bySlug`/`byId` read therefore returns `null`, while a list returns an empty
array or envelope. Personal collection routes render an empty collection rather
than a missing resource.

| Route                       | Rendering            | Waiting UI                       | Missing resource                                  |
| --------------------------- | -------------------- | -------------------------------- | ------------------------------------------------- |
| `/`                         | static ISR           | none                             | none                                              |
| `/produtos`                 | dynamic              | `produtos/loading.tsx`           | none                                              |
| `/produtos/[...categoria]`  | dynamic              | inherited `produtos/loading.tsx` | bad Category is a soft 404                        |
| `/produto/[slug]`           | on-demand static ISR | none                             | unknown, draft, or archived Product is a hard 404 |
| `/carrinho`                 | dynamic              | page `<Suspense>`                | never 404s                                        |
| `/checkout`                 | dynamic              | page `<Suspense>`                | never 404s                                        |
| `/checkout/[id]`            | dynamic              | page `<Suspense>`                | unknown or foreign Order is a hard 404            |
| `/sobre`                    | static               | none                             | none                                              |
| `/contato`                  | static               | none                             | none                                              |
| `/termos-de-uso`            | static               | none                             | none                                              |
| `/politica-de-privacidade`  | static               | none                             | none                                              |
| `/trocas-e-devolucoes`      | static               | none                             | none                                              |
| `/login`                    | dynamic              | shared auth loading boundary     | none                                              |
| `/cadastro`                 | dynamic              | shared auth loading boundary     | none                                              |
| `/minha-conta`              | dynamic redirect     | none                             | none                                              |
| `/minha-conta/perfil`       | dynamic              | page `<Suspense>`                | none                                              |
| `/minha-conta/enderecos`    | dynamic              | page `<Suspense>`                | none                                              |
| `/minha-conta/pedidos`      | dynamic              | segment `loading.tsx`            | none                                              |
| `/minha-conta/pedidos/[id]` | dynamic              | segment `loading.tsx`            | unknown or foreign Order is a soft 404            |
| `/minha-conta/favoritos`    | dynamic              | page `<Suspense>`                | none                                              |

### Metadata and SEO

Metadata is cross-cutting: the root layout owns what is true of the whole
deployment, and every route states only what is true of itself. A segment
exports either a static `metadata` object or `generateMetadata`, never both —
Next rejects the pair in one file. `generateMetadata` is used only where a title,
description, canonical, or `robots` value depends on a read or on the query
string: `/produto/[slug]`, `/produtos`, and `/produtos/[...categoria]`. Every
other route exports a static object.

**The root layout.** It sets `metadataBase` from `NEXT_PUBLIC_APP_URL`, the
`Hertz Lab` title default, and the `%s | Hertz Lab` template. `metadataBase` is
mandatory rather than convenient: a relative URL in any metadata field without
it fails the build. `/` is the single route that uses `title.absolute`, because
a home page leads with the store name and every other route trails it. No route
uses `absolute` for any other reason.

There is deliberately no `viewport` export and no `themeColor`. Next emits a
correct default viewport; there is no installable manifest; and `DESIGN.md`
ships the Storefront light-only, so a `themeColor` would copy a design token
into a metadata file, which is the one place its drift would go unnoticed.

**Titles and descriptions.** Static routes hold their own Brazilian Portuguese
strings. A derived route reads them from the resource: `title` is
`product.name` or `category.name`, riding the root template. A Product
description is `product.description`, whitespace-collapsed and cut to roughly
155 characters on a word boundary by a helper, never in a component. A Category
description is `category.description` when present and a templated pt-BR
sentence built from the name when it is null. No table carries a metadata
column; adding one is a schema change and out of scope.

`generateMetadata` and the page body are two separate calls, and `caller` is not
memoised. Every derived route therefore reads through a React `cache()`-wrapped
function shared by both, or it issues its query twice per request.

**Canonical URLs.** A path is a resource and a query string is a view
(ADR-0041), so a canonical URL is a pathname plus `pagina` (ADR-0052), and every other
catalogue parameter is dropped: `/produtos?marca=jbl&pagina=2` canonicalises to
`/produtos?pagina=2`. `pagina=1` is dropped as well, and the pagination control
links page one as the bare pathname, so one page of Products has one URL.
Category paths are self-canonical unchanged, because ADR-0043 already made a
Category path a canonical subtree and the route 404s a path whose parent does
not match. There are no `alternates.languages`: the store is pt-BR only, and an
`hreflang` set of one is noise.

**Index policy.** Indexable: `/`, `/produtos`, every Category path, every
active `/produto/[slug]`, and the five institucional routes. `noindex, follow`:
any catalogue view carrying a filter or search parameter, `pagina` excepted.
`noindex, nofollow`: `/carrinho`, `/checkout`, `/checkout/[id]`, `/login`,
`/cadastro`, and all six account routes.

An empty view gets no special case. A filtered view that matches nothing is
already `noindex` for carrying the filter; a bare Category path with no active
Products stays indexable, because it is a real resource that will fill, and
deciding otherwise would make metadata wait on a Product count it does not
otherwise need. Because the `robots` field is a nested object, the last segment
to define it replaces the whole thing rather than merging — a route that sets
`robots` states every flag it wants.

**Open Graph.** A committed `app/opengraph-image.png` at 1200×630 with its
`opengraph-image.alt.txt` serves every route through the file convention, which
the object-merge rule does not touch. `/produto/[slug]` is the one exception: it
sets `openGraph.images` to the Cover's CDN URL through `s3KeyToUrl`, with the
Image's `altText` as the alt. It is the Cover alone, because a share card shows
one image and the Cover is the one chosen to stand for the Product.

Any route that sets `openGraph` spreads the shared base object first. Nested
metadata objects are replaced, not merged, so a page that sets `openGraph.images`
alone silently drops the deployment's `siteName`, `locale`, and `type`. This
failure is invisible in the rendered page, which is why the shared object exists.

**Structured data.** Next has no JSON-LD support, so a Server Component renders
a `<script type="application/ld+json">` through one shared helper. ADR-0053
governs what a graph may claim. Emitted:
`Product` on `/produto/[slug]`, `BreadcrumbList` on `/produto/[slug]` and
`/produtos/[...categoria]`, and `Organization` plus `WebSite` on `/`.
`Organization` draws its facts from `lib/store.ts` and its `logo` from the
committed square mark in `public/`.

The `Product` graph carries `name`, `description`, every Image in the page
projection with the Cover first, `brand`, and an `AggregateOffer` with
`lowPrice`, `highPrice`, `priceCurrency: "BRL"`, and an availability derived
from summed Variant stock; a single-Variant Product emits a plain `Offer` with
its `sku`. `aggregateRating` is emitted only when `ratingCount` is greater than
zero. Individual `Review` objects are not emitted: the island pages in more
approved Reviews than any fixed graph would name, so the markup would stop
matching the page after one interaction, and `aggregateRating` says the same
thing without drifting.

Every fact in a graph comes from the same `cache()`d read the route renders
from. A second query for structured data can disagree with the visible page,
which is the failure this rule exists to prevent. There is no `SearchAction`.

**`sitemap.ts` and `robots.ts`.** `app/sitemap.ts` lists `/`, `/produtos`, the
five institucional paths, every Category's canonical path, and every active
Product at `/produto/<slug>` with `lastModified` from `product.updatedAt`.
Nothing else appears: a noindex route has no place in a sitemap. `app/robots.ts`
allows all agents, disallows `/carrinho`, `/checkout`, `/minha-conta`, `/login`,
`/cadastro`, and `/api`, and points at the sitemap. It does not disallow
catalogue query strings, because a `noindex, follow` view has to be crawled for
its links to be followed.

Both are Route Handlers, cached by default unless they read a Request-time API.
Both set `revalidate` to one hour rather than joining the invalidation set
ADR-0036 and ADR-0047 maintain: an hour of latency in a crawler artifact costs
nothing, while a `revalidatePath` call in every Product and Category write is a
list the next write has to remember. Their reads are shop procedures returning
slug and `updatedAt` unpaginated; the `server/` import rule in `MODULES.md`
governs a Route Handler exactly as it governs a page. Google's 50,000-URL limit
is far away, and `generateSitemaps` is the split if it ever is not.

**Where it lives.** `lib/seo.ts` holds what no module owns: `metadataBase`, the
shared Open Graph base, the `noindex` presets, and the JSON-LD render helper.
Resource-shaped builders live with their module — the catalogue canonical and
`robots` derivation in `modules/products/shop/`, which already owns the
parameter names they need, and the Category builders in
`modules/categories/shop/`.

### Catalogue invariants

Storefront sections are derived queries. There is no `featured` flag, banner
table, or Category position. The home hero photograph is the single committed
static exception; ADR-0028 and `DESIGN.md` own its asset and composition.

Only active Products are public. An archived Product is a 404, while an active
out-of-stock Product remains visible. Every card read projects the same
`ProductCardRow`: Product slug and name, Brand name, Cover key and alt text,
lowest Variant price and its compare-at price, and Variant count. The price-row
tie-break is Variant position then id. `variantCount > 1` determines whether the
card uses the “A partir de” label. The Cover join is inner because publishing
requires every active Product to be photographable.

## `(shop)` routes

### `/`

**Structure.** Six Server Component blocks, in this order: Hero, Categorias,
Promoções, Mais vendidos, Novidades, and Mais bem avaliados. The Hero contains
the committed decorative photograph, page heading, supporting copy, and a link
to `/produtos`. Categorias links every root Category to
`/produtos/<root-slug>` and includes its optional decorative picture. Each
Product preview contains at most four shared Product cards and a link to its
full catalogue view; an empty preview is omitted.

**Data flow.** The page uses `caller` throughout. It starts
`categories.shop.roots()` and `products.shop.promotions()` together, then calls
`products.shop.bestSellers({ excludeProductIds })`,
`products.shop.newest({ excludeProductIds })`, and
`products.shop.topRated({ excludeProductIds })` in display order. Each later
read excludes earlier Product ids before applying its limit, so sections remain
unique and backfill. The four full views are
`?promocao=1&ordenar=maior-desconto`, `?ordenar=mais-vendidos`,
`?ordenar=recentes`, and `?ordenar=avaliados`. Nothing crosses the RSC boundary.
The Hero uses a static `next/image` import with `preload`, explicit `sizes`, and
empty alt text because it is the LCP element and its adjacent text carries the
message.

### `/produtos`

**Structure.** The page owns the heading and normalized URL input. A shared
server `Catalog` owns the filter controls, Product grid, pagination, and empty
state. The controls cover search, Brand, minimum/maximum price, and sort. There
is no Category filter. Pagination is server-rendered and fixed at 24 Products
per page; 24 avoids incomplete rows at every grid column count rather than
being a visual preference. An empty filtered view offers an action that clears
the query string while retaining the pathname.

The search control is a debounced box over the same `?busca=` the header
writes, positioned in the bar outside the `Filtrar` Sheet. It shows the term
the grid is for and refines it, which the header's always-empty input cannot,
and it is what makes the `relevância` sort reachable without editing the URL
by hand.

**Data flow.** `parseCatalogParams` maps `busca`, `marca`, `preco_min`,
`preco_max`, `ordenar`, `promocao`, and `pagina` to the English input consumed
by `products.shop.list(input)`. Search defaults to relevance; other views
default to recent. Price URL values are reais and cross the schema seam as
cents. `Catalog` calls `products.shop.list(input)` and
`brands.shop.options()` together through `caller`. The list returns
`{ items: ProductCardRow[], total }`; Brand options include only Brands with a
visible Product. Only normalized filter state and Brand options cross to one
client filter-control tree. Product rows stay server-rendered. Filter changes
use `router.replace`, discard `pagina`, and never create competing duplicate
control trees.

### `/produtos/[...categoria]`

**Structure.** A server breadcrumb trail, then the Category heading, optional
description, and child Category links with optional decorative pictures, then
the same `Catalog` used by `/produtos`. The trail is
`Início › Produtos › <root> › <child>`, collapsing a segment when the Category
is a root, and it is the visible counterpart of the `BreadcrumbList` this route
emits — neither exists without the other. A Category picture is not part of its
own route. A root Category includes itself and its children in the Product
narrowing; a child has no children and naturally narrows to itself. There is no
Category filter because the path is the fixed narrowing.

**Data flow.** The page rejects more than two path segments before reading.
`categories.shop.bySlug({ slug: lastSegment })` returns the Category, parent
slug, and children. The page validates that a one-segment URL names a root and
that a two-segment URL matches the returned parent. It then sorts
`categoryIds = [category.id, ...children.map(id)]` for stable query identity and
passes them with the normalized catalogue input to
`products.shop.list({ ...input, categoryIds })`. The Category read, Product
list, and Brand options use `caller`. Only filter state and Brand options cross
to the client controls; Category and Product markup remain server-rendered.

### `/produto/[slug]`

**Structure.** A server breadcrumb trail, then five blocks, in this order:
purchase area, Specifications, Description, Reviews, and Related Products. The
trail is `Início › Produtos › <root> › <child> › <Product>`, collapsing a
segment when the Product's Category is a root. It is the visible counterpart
of the `BreadcrumbList` this route emits, and it is also the only upward path
from a Product to its Category: the header carries flat root links with no
dropdown (ADR-0042), so a shopper landing here from search otherwise cannot
reach the Category the Product belongs to. Specifications and Related Products
are omitted when empty; Reviews remains so an eligible shopper can author the
first Review. The purchase area is one client entry point composing Gallery and
Buy panel because selected Variant, selected Image, and quantity are one state.
The remaining blocks begin as server markup.

The first ordered Variant is initially selected, even at zero stock. Changing
Variant resets Image and quantity. The Gallery uses that Variant’s ordered
Images when present and otherwise Product-level Images; it never borrows a
sibling Variant’s Image. The Buy panel carries Brand, Product heading, rating
summary, selected price, Variant selection, stock, quantity, Cart action, and
Wishlist control. Quantity cannot exceed stock. A zero-stock Variant remains
selectable and saveable but cannot be added to Cart. There is no Variant query
parameter.

**Data flow.** `products.shop.bySlug({ slug })` is a `baseProcedure` returning
the page projection or `null`. The projection includes the Product's Category as
`{ name, slug, parentSlug }` — the trail and the `BreadcrumbList` need the names
and the canonical path, which `categoryId` alone cannot build. After existence
is established, the page starts `reviews.shop.list({ productId })` and
`products.shop.related({ productId, categoryId })` together. All three use
`caller`. The route exports `generateStaticParams() { return [] }`, reads no
Request-time API, and caches each active slug after its first request.

Only the Product fields used by Gallery and Buy panel cross into their client
entry point. The initial approved Review page stays server-rendered; a client
leaf receives `productId` and `nextCursor` to append later public pages.
`reviews.shop.writingState({ productId })` and
`wishlist.isSaved({ variantId })` are separate protected, cold, session-gated
client queries. Neither is prefetched or hydrated. Cart add and Wishlist save
use their owning mutation hooks; anonymous activation returns through
`/login?retorno=/produto/<slug>` and never replays the write automatically.

`reviews.shop.list` returns five approved Reviews at a time as
`{ items, nextCursor }`. The writing island submits
`reviews.shop.create({ productId, rating, title?, body })`; the mutation proves
delivered ownership independently and invalidates only `writingState` while the
new Review is pending. Related Products returns at most four cards from the
exact same Category, excluding the current Product.

### `/carrinho`

**Structure.** After the heading, a client Cart body renders either an empty
state linking to `/produtos` or a line list followed by a merchandise subtotal
and `/checkout` action. Coupon, discount, shipping, and final total are absent.
Each line contains current Cover fallback, Product and Variant names, current
unit price, requested quantity, line total, availability, quantity control, and
removal. Active Products link to their Product route; archived Products do not.

Unavailable or under-stocked lines remain with the shopper’s requested
quantity, contribute to the badge count, are excluded from subtotal, and block
checkout until corrected or removed. Prices are always current; a Cart stores
no price history. `cart.get` returns an empty Cart rather than `null` when no row
has been persisted.

**Data flow.** The page calls `requireAuth()`, starts unawaited
`prefetch(trpc.cart.get.queryOptions())`, and renders the client Cart beneath
`<HydrateClient>` and `<Suspense>`. The dehydrated `cart.get` value is the only
Cart state crossing the RSC boundary; the page does not render it directly.
The query returns `{ items, subtotalAmount, totalQuantity, canCheckout }`.

`cart.add`, `cart.setQuantity`, and `cart.remove` are protected mutations.
Every hook invalidates `trpc.cart.pathFilter()`, keeping the route and frame
badge on one key. Quantity and removal update that key optimistically with
rollback and authoritative invalidation; add waits for the server. There is no
second client store and no `router.refresh()`.

### `/checkout`

**Structure.** One protected placement form with sections in dependency order:
Customer, Address, Shipping Method, Coupon, Order review, and Payment. Existing
Customer Document and phone are immutable here; when the profile is absent they
become required placement input. Saved Address selection may create or edit an
Address inline. Shipping and Payment have no preselection. Coupon text becomes
effective only after an explicit apply action. An empty Cart links to
`/produtos`; any unavailable line suppresses placement and links to
`/carrinho`.

**Data flow.** The page calls `requireUser()`, starts unawaited prefetches for
`cart.get`, `customers.shop.profile`, and `customers.shop.addresses`, and reads
active Shipping Methods through the no-input server call
`caller.shippingMethods.list()`. The three dehydrated queries cross beneath
`<HydrateClient>` and `<Suspense>`; Shipping Methods cross as ordinary props.
`checkout.quote({ shippingMethodId, couponCode? })` is a cold protected client
query enabled only by a selected method and applied Coupon. Its
`{ subtotalAmount, shippingAmount, discountAmount, totalAmount, coupon }` result
is the only total rendered.

`checkout.place` receives the selected Address and Shipping Method ids, applied
Coupon, Customer facts only when required, provider-safe Payment input, and the
expected total. It performs ADR-0039’s transaction once and contacts Mercado
Pago only after commit using the internal Payment id for idempotency. Every
provider outcome means the Order exists; success replaces history with
`/checkout/<orderId>`. The hook invalidates Cart and Customer paths and owns no
optimistic Order. A lost response with an empty refetched Cart is treated as
ambiguous and points to Order history rather than resubmitting.

### `/checkout/[id]`

**Structure.** A durable Payment-completion resource for an already placed
Order. It renders provider-safe pending instructions/status, terminal approved
or refunded states linking to the Order receipt, or retry for rejected,
cancelled, and provider-uninitialized attempts. It does not duplicate the
immutable receipt. There is no automatic unpaid-Order expiry.

**Data flow.** The page calls `requireUser()`, awaits
`caller.orders.shop.byId({ id })`, and resolves absence before streaming. It
then starts unawaited
`prefetch(trpc.payments.completion.queryOptions({ orderId: id }))` and renders
the client completion component beneath `<HydrateClient>` and `<Suspense>`.
Only the adapted dehydrated completion state crosses the RSC boundary; raw
provider payload never does.

A provider-backed pending attempt polls `payments.completion` while mounted.
`payments.retry({ orderId, paymentInput })` creates a new Payment only after
proving the Order is owned, remains `pending_payment`, and has no approved or
provider-backed pending attempt. It never replaces the Order or repeats Cart,
stock, or Coupon writes.

### `/sobre`

**Structure.** The page owns its heading, metadata, and authored store prose.
**Data flow.** The route reads no data and crosses no RSC boundary.

### `/contato`

**Structure.** The page owns its heading, metadata, authored contact prose, a
`mailto:` using the shared store email, and a link to
`/trocas-e-devolucoes`. It contains no contact form.
**Data flow.** Contact facts come from `lib/store.ts`; there is no procedure,
client state, or RSC crossing.

### `/termos-de-uso`

**Structure.** The page owns its heading, metadata, authored legal prose, and a
literal last-updated date beside that prose.
**Data flow.** The route reads no data and crosses no RSC boundary.

### `/politica-de-privacidade`

**Structure.** The page owns its heading, metadata, authored legal prose, and a
literal last-updated date beside that prose.
**Data flow.** The route reads no data and crosses no RSC boundary.

### `/trocas-e-devolucoes`

**Structure.** The page owns its heading, metadata, authored legal prose, and a
literal last-updated date beside that prose.
**Data flow.** The route reads no data and crosses no RSC boundary.

The five institucional pages share a layout that owns only their common content
scope. Their copy is JSX in each route file, not MDX or database content.

## `(auth)` routes

### `/login`

**Structure.** The credential form contains email, password, submit, and the
link to `/cadastro`. The cross-link preserves an eligible return destination.
An authenticated visitor is redirected before the form renders. Field errors
stay with their fields; credential and unexpected failures use a form-level
state, with the banned-account case retaining its specific message.

**Data flow.** The Server Component normalizes the single `?retorno=` value,
reads the session authoritatively with `getCurrentSession()`, and redirects an
existing session to a role-compatible destination or role home. Otherwise only
`string | undefined` return intent crosses to `SignInForm`. The form calls
`authClient.signIn.email` directly; it uses no tRPC, `caller`, `load`,
`prefetch`, or hydration. Success replaces browser history.

A User return may target `/carrinho`, `/checkout`, `/minha-conta`, an account
descendant, or one canonical `/produto/<slug>` path. An Admin return may target
`/admin` or an admin descendant. Query strings survive; external,
protocol-relative, backslash, auth, API, repeated, nonexistent, and
role-incompatible targets are discarded. The proxy preserves a denied pathname
and query for the authoritative page guard without becoming authorization.

### `/cadastro`

**Structure.** The credential form contains name, email, password, password
confirmation, submit, and the link to `/login`. The cross-link preserves an
eligible return destination. An authenticated visitor is redirected before the
form renders. Cadastro creates a Better Auth User only; Customer Document,
phone, and Addresses remain checkout/account concerns.

**Data flow.** The page uses the same return normalization and fresh server
session check as `/login`, then passes only `string | undefined` to
`SignUpForm`. The form calls `authClient.signUp.email` directly and retains
Better Auth’s automatic sign-in. It uses no tRPC read path or hydration.
Success replaces history with a valid User destination or `/`.

## `(account)` routes

### `/minha-conta`

**Structure.** This route has no dashboard or route content.
**Data flow.** It calls `requireUser()` and redirects to
`/minha-conta/pedidos`. It performs no procedure call and crosses no RSC
boundary.

### `/minha-conta/perfil`

**Structure.** Identity and Customer are independent sections and independent
writes. Identity edits the Better Auth name and renders email read-only.
Customer is absent before first checkout; afterward it renders immutable
Document plus editable phone and optional birth date. Email/password changes,
account deletion, and Customer creation are absent.

**Data flow.** The page calls `requireUser()` and uses the returned fresh User
for the identity section. Name updates call `authClient.updateUser` directly.
It also starts unawaited
`prefetch(trpc.customers.shop.profile.queryOptions())`; the Customer client
section reads the dehydrated query beneath `<HydrateClient>` and `<Suspense>`.
`customers.shop.profile()` returns `null` or
`{ document, phone, birthDate }`. `customers.shop.updateProfile` updates only an
existing profile and invalidates the Customer module path. The User fields and
dehydrated Customer query are the only values crossing the RSC boundary.

### `/minha-conta/enderecos`

**Structure.** An unpaginated Address book contains at most ten complete saved
destinations and create, edit, make-default, and remove actions. An empty list
offers first creation. The first Address becomes default; choosing another
clears the old default; deleting the default chooses no successor. Create and
edit are local dialogs, while removal confirms durable deletion.

**Data flow.** The page calls `requireUser()` and starts unawaited
`prefetch(trpc.customers.shop.addresses.queryOptions())`. The normalized bare
array crosses through `<HydrateClient>` to the client Address book beneath
`<Suspense>`. `createAddress`, `updateAddress`, `setDefaultAddress`, and
`removeAddress` are protected Customer mutations scoped to the ambient User.
Each serializes per User with the same transaction advisory lock and invalidates
the Customer module path. No Address write is optimistic.

### `/minha-conta/pedidos`

**Structure.** Server-rendered Order history with ten rows per page, pagination,
and an empty state linking to `/produtos`. Each row contains the human Order
number, placement date, current Order status, item count, total, and a link by
internal id. Filters and alternate sorting are absent.

**Data flow.** The page calls `requireUser()`, parses `?pagina=` once, and awaits
`caller.orders.shop.list({ page })`. The protected procedure scopes to the User,
orders by placement time then id, and returns `{ items, total }` using Order
Snapshot facts. Nothing crosses to a Client Component. An out-of-range page is
an empty view, not a 404.

### `/minha-conta/pedidos/[id]`

**Structure.** A server-rendered immutable receipt contains buyer, Address,
delivery, Coupon, totals, and every Order Item Snapshot; current fulfilment;
current Order status; chronological public status history; the latest safe
Payment summary when present; and one Review path state per unique Product.
Current Catalog values never replace Snapshot values. Payment status remains
separate from Order status. Retry and polling remain on `/checkout/[id]`.

**Data flow.** After `requireUser()`, the page awaits
`caller.orders.shop.byId({ id })`, which matches both Order and ambient User and
returns `null` for unknown and foreign ids. Once existence is proved, it starts
`caller.payments.latestForOrder({ orderId })` and
`caller.reviews.shop.forOrder({ orderId })`; the three server reads may settle
together after the ownership gate. No query is hydrated and nothing crosses to
a Client Component. The Review path links an active delivered Product to its
Reviews block when authoring or viewing is available; archived Products never
link to their 404 route.

### `/minha-conta/favoritos`

**Structure.** A client Wishlist lists saved Variants, 24 per page, with current
Product/Variant facts, current availability, removal, and add-to-Cart only when
available. Empty and out-of-range views link to `/produtos`. Archived and
sold-out entries remain visible for removal; archived Products do not link.
Adding to Cart does not remove a saved Variant.

**Data flow.** The page calls `requireUser()`, parses `?pagina=` once, starts
unawaited `prefetch(trpc.wishlist.list.queryOptions({ page }))`, and passes the
same input to the client list beneath `<HydrateClient>` and `<Suspense>`.
`wishlist.list` returns `{ items, total }`, scoped to the User and ordered by
save time then Variant id. The dehydrated list and normalized input cross the
RSC boundary.

`wishlist.isSaved`, `wishlist.save`, and `wishlist.unsave` are protected and
Variant-addressed. Save and unsave are explicit idempotent commands; their hooks
invalidate the Wishlist module path so membership and all list pages converge.
The product-page membership control remains a separate cold, session-gated
query as specified by `/produto/[slug]`.
