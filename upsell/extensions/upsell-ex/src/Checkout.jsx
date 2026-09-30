import '@shopify/ui-extensions/preact';
import {render} from 'preact';
import {useState, useEffect} from 'preact/hooks';

export default async () => {
  render(<Extension />, document.body);
};

function Extension() {
  const [product, setProduct] = useState(null);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        let productGid = null;

        for (let i = 0; i < 10; i++) {
          const mf = shopify.appMetafields?.value || [];
          const upsellMf = mf.find((m) => m.metafield.key === 'checkout_upsell');
          productGid = upsellMf?.metafield?.value;
          if (productGid) break;
          await new Promise((r) => setTimeout(r, 300));
        }

        if (!productGid) { setReady(true); return; }

        const result = await shopify.query(
          `
          query getProduct($id: ID!) {
            product(id: $id) {
              id
              title
              featuredImage { url altText }
              variants(first: 1) {
                edges {
                  node {
                    id
                    price { amount currencyCode }
                  }
                }
              }
            }
          }
          `,
          { variables: { id: productGid } }
        );

        const p = result?.data?.product;
        if (p) setProduct(p);
      } catch (e) {
        setError(e.message);
      } finally {
        setReady(true);
      }
    }

    load();
  }, []);

  if (!ready || !product) return null;

  const variantId = product?.variants?.edges?.[0]?.node?.id;
  const price = product?.variants?.edges?.[0]?.node?.price;
  const imageUrl = product?.featuredImage?.url;

  async function handleAdd() {
    if (!variantId) { setError('No variant found'); return; }

    setAdding(true);
    setError(null);

    try {
      const result = await shopify.applyCartLinesChange({
        type: 'addCartLine',
        merchandiseId: variantId,
        quantity: 1,
      });

      if (result.type === 'success') {
        setAdded(true);
      } else {
        setError(JSON.stringify(result));
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setAdding(false);
    }
  }

  return (
    <s-grid gridTemplateColumns="65px 12px 1fr">
      <s-image
        src={imageUrl}
        alt={product.featuredImage?.altText || 'Product image'}
        width={65}
        height={65}
        borderRadius="base"
      />

      <s-text></s-text>

      <s-grid-item>
        <s-stack gap="tight">
          <s-text>{product.title}</s-text>
          <s-text>{price.currencyCode} {Number(price.amount).toFixed(2)}</s-text>

          {!added && (
            <s-button kind="primary" loading={adding} onClick={handleAdd}>
              Add to cart
            </s-button>
          )}

          {error && <s-text appearance="critical">{error}</s-text>}
        </s-stack>
      </s-grid-item>
    </s-grid>
  );
}
