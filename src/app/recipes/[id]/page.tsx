import Link from "next/link";
import { notFound } from "next/navigation";
import { RecipeNotesTagsEditor } from "@/app/RecipeNotesTagsEditor";
import { createRecipeRepository } from "@/lib/createImporter";

export const dynamic = "force-dynamic";

export default async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const recipe = await createRecipeRepository().getById(id);
  if (!recipe) {
    notFound();
  }

  return (
    <>
      <header className="content-header">
        <p>
          <Link href="/">Back to Home</Link>
        </p>
        <h1 className="page-title">{recipe.title}</h1>
        <p className="caption">
          {recipe.sourceType}
          {recipe.servings ? ` · ${recipe.servings} servings` : ""}
        </p>
      </header>
      <section className="card recipe-card">
        {recipe.sourceUrl ? (
          <p>
            From <a href={recipe.sourceUrl}>{recipe.sourceUrl}</a>
          </p>
        ) : null}
        {recipe.notes ? <p>{recipe.notes}</p> : null}
        {recipe.tags.length > 0 ? (
          <div className="tag-row">
            {recipe.tags.map((tag) => (
              <span key={tag} className="tag">
                {tag}
              </span>
            ))}
          </div>
        ) : null}
        <RecipeNotesTagsEditor recipeId={recipe.id} initialNotes={recipe.notes} initialTags={recipe.tags} />
        <h2 className="section-title">Ingredients</h2>
        <ul>
          {recipe.ingredients.map((ingredient, index) => (
            <li key={`${ingredient.name}-${index}`}>
              {[ingredient.quantity, ingredient.unit, ingredient.name].filter(Boolean).join(" ")}
              {ingredient.note ? `, ${ingredient.note}` : ""}
              {ingredient.parseFlagged ? <span className="flag"> Check this line.</span> : ""}
            </li>
          ))}
        </ul>
        <h2 className="section-title">Steps</h2>
        <ol>
          {recipe.steps.map((step, index) => (
            <li key={`${index}-${step.slice(0, 12)}`}>{step}</li>
          ))}
        </ol>
      </section>
    </>
  );
}
