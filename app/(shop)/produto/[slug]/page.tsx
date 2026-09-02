const ProductPage = async ({ params }: PageProps<"/produto/[slug]">) => {
  const { slug } = await params;

  return <h1>Produto: {slug}</h1>;
};

export default ProductPage;
