import { IngestForm } from "@/app/IngestForm";
import { createRecipeRepository } from "@/lib/createImporter";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const recipes = await createRecipeRepository().list();

  return (
    <>
      <header className="content-header">
        <h1 className="page-title">Recipe pool</h1>
        <p className="lede">Paste a URL or raw text. Review before it is saved.</p>
      </header>
      <IngestForm
        initialRecipes={recipes.map((recipe) => ({
          id: recipe.id,
          title: recipe.title,
          sourceType: recipe.sourceType,
          notes: recipe.notes,
          tags: recipe.tags,
        }))}
      />
    </>
  );
}
