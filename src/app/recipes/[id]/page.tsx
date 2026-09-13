import Link from "next/link";
import { notFound } from "next/navigation";
import { AssignRecipeToMeal } from "@/app/AssignRecipeToMeal";
import { RecipeEmojiMark } from "@/app/RecipeEmojiFields";
import { RecipeNotesTagsEditor } from "@/app/RecipeNotesTagsEditor";
import { RecipePageManage } from "@/app/RecipePageManage";
import { RecipeEmojiAssigner } from "@/domain/recipe/RecipeEmojiAssigner";
import type { RecipeNutrition } from "@/domain/recipe/RecipeNutrition";
import { RecipeNutritionSummary } from "@/domain/recipe/RecipeNutritionSummary";
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
          <Link href="/recipes">Back to Recipe</Link>
        </p>
        <h1 className="page-title">
          <RecipeEmojiMark emojis={new RecipeEmojiAssigner().display(recipe.emojis, recipe)} /> {recipe.title}
        </h1>
        <p className="caption">
          {recipe.sourceType}
          {recipe.servings ? ` · ${recipe.servings} servings` : ""}
          {nutritionLine(recipe)}
        </p>
      </header>
      <section className="card recipe-card">
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
        <RecipePageManage recipe={recipe} />
        <AssignRecipeToMeal recipeId={recipe.id} />
        <RecipeNotesTagsEditor
          recipeId={recipe.id}
          initialNotes={recipe.notes}
          initialTags={recipe.tags}
          initialEmojis={recipe.emojis}
        />
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

function nutritionLine(recipe: RecipeNutrition): string {
  const summary = new RecipeNutritionSummary().format(recipe);
  return summary ? ` · ${summary}` : "";
}
