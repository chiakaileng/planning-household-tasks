import { IngestForm } from "@/app/IngestForm";
import { createRecipeRepository } from "@/lib/createImporter";

export const dynamic = "force-dynamic";

export default async function RecipesPage() {
  const recipes = await createRecipeRepository().list();

  return (
    <>
      <header className="content-header">
        <h1 className="page-title">Recipe</h1>
        <p className="lede">Paste a URL or raw text. Review before it is saved.</p>
      </header>
      <IngestForm
        initialRecipes={recipes.map((recipe) => ({
          id: recipe.id,
          title: recipe.title,
          sourceType: recipe.sourceType,
          sourceUrl: recipe.sourceUrl,
          sourceText: recipe.sourceText,
          notes: recipe.notes,
          tags: recipe.tags,
          emojis: recipe.emojis,
          calories: recipe.calories,
          protein: recipe.protein,
          fat: recipe.fat,
          carbohydrates: recipe.carbohydrates,
          fibre: recipe.fibre,
        }))}
      />
    </>
  );
}
