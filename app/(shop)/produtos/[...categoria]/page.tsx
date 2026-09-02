const CategoryPage = async ({
  params,
}: PageProps<"/produtos/[...categoria]">) => {
  const { categoria } = await params;

  return <h1>Categoria: {categoria.join(" / ")}</h1>;
};

export default CategoryPage;
