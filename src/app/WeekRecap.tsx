"use client";

import { MemberAvatarView } from "@/app/MemberAvatarView";
import type { SavedMember } from "@/domain/member/SavedMember";
import { MemberWeekRecap, type RecapDish } from "@/domain/plan/MemberWeekRecap";
import type { PlannedMeal } from "@/domain/plan/PlannedMeal";
import { RecapRoleFilter, type RecapLens } from "@/domain/plan/RecapRoleFilter";
import { RecapWatchList } from "@/domain/plan/RecapWatchList";
import { RecipeDishOpener } from "@/domain/plan/RecipeDishOpener";

const recap = new MemberWeekRecap();
const watchList = new RecapWatchList();
const roleFilter = new RecapRoleFilter();
const recipeOpener = new RecipeDishOpener();

export function WeekRecap({
  days,
  today,
  meals,
  members,
  watchIds,
  roles,
  onWatchIds,
  onRoles,
  onOpenRecipe,
  weekdayLabel,
  dateLabel,
  gridStyle,
}: {
  days: string[];
  today: string;
  meals: PlannedMeal[];
  members: SavedMember[];
  watchIds: string[];
  roles: RecapLens[];
  onWatchIds: (ids: string[]) => void;
  onRoles: (roles: RecapLens[]) => void;
  onOpenRecipe: (recipeId: string) => void;
  weekdayLabel: (iso: string) => string;
  dateLabel: (iso: string) => string;
  gridStyle: { gridTemplateColumns: string };
}) {
  const watched = watchIds
    .map((id) => members.find((member) => member.id === id))
    .filter((member): member is SavedMember => Boolean(member));
  const available = members.filter((member) => !watchIds.includes(member.id));
  const lenses = roleFilter.ordered(roles);
  const showGrid = watched.length > 0 && lenses.length > 0;

  return (
    <div className="week-recap">
      <div className="recap-head">
        <div>
          <h2 className="section-title">Recap</h2>
          <p className="caption">Pick who, then eating and/or cooking. Empty is fine.</p>
        </div>
        {members.length === 0 ? (
          <p className="caption">
            Add people first. <a href="/members">Members</a>
          </p>
        ) : (
          <div className="recap-filters">
            <div className="recap-picker" aria-label="People to watch">
              {watched.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  className="tag is-selected"
                  onClick={() => onWatchIds(watchList.remove(watchIds, member.id))}
                >
                  {member.name} ×
                </button>
              ))}
              {available.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  className="tag"
                  onClick={() => onWatchIds(watchList.add(watchIds, member.id))}
                >
                  {member.name}
                </button>
              ))}
            </div>
            <div className="recap-picker" aria-label="Show eating or cooking">
              <button
                type="button"
                className={`tag recap-lens-eat${roleFilter.includes(roles, "eats") ? " is-selected" : ""}`}
                onClick={() => onRoles(roleFilter.toggle(roles, "eats"))}
              >
                Eating
              </button>
              <button
                type="button"
                className={`tag recap-lens-cook${roleFilter.includes(roles, "cooks") ? " is-selected" : ""}`}
                onClick={() => onRoles(roleFilter.toggle(roles, "cooks"))}
              >
                Cooking
              </button>
            </div>
          </div>
        )}
      </div>

      {showGrid ? (
        <>
          <div className="calendar-grid recap-grid" style={gridStyle}>
            <div className="calendar-corner" />
            {days.map((day, index) => (
              <div
                key={`recap-head-${day}`}
                className={`calendar-dayhead${day === today ? " is-today" : ""}${index === days.length - 1 ? " is-sunday" : ""}`}
              >
                <span className="calendar-weekday">{weekdayLabel(day)}</span>
                <span className="calendar-date">{dateLabel(day)}</span>
              </div>
            ))}
          </div>
          {watched.flatMap((member) =>
            lenses.map((lens) => (
              <div key={`${member.id}-${lens}`} className="calendar-grid recap-grid" style={gridStyle}>
                <div className={`calendar-slotlabel recap-member is-${lens}`}>
                  <MemberAvatarView member={member} size="sm" />
                  <span className="recap-member-name">{member.name}</span>
                  <span className={`recap-role-mark is-${lens}`}>{lens === "eats" ? "Eats" : "Cooks"}</span>
                </div>
                {recap.daysFor(member.id, meals, days, lens).map((day, index) => {
                  const sundayClass = index === days.length - 1 ? " is-sunday" : "";
                  return (
                    <div
                      key={`${member.id}-${lens}-${day.date}`}
                      className={`calendar-cell recap-cell is-${lens}${day.date === today ? " is-today" : ""}${sundayClass}`}
                    >
                      {day.dishes.map((dish) => (
                        <RecapDishButton key={dish.dishId} dish={dish} lens={lens} onOpenRecipe={onOpenRecipe} />
                      ))}
                    </div>
                  );
                })}
              </div>
            )),
          )}
        </>
      ) : null}
    </div>
  );
}

function RecapDishButton({
  dish,
  lens,
  onOpenRecipe,
}: {
  dish: RecapDish;
  lens: RecapLens;
  onOpenRecipe: (recipeId: string) => void;
}) {
  const opens = recipeOpener.canOpen(dish);
  return (
    <button
      type="button"
      className={`dish-pill is-${lens}`}
      disabled={!opens}
      onClick={() => {
        if (opens && dish.recipeId) {
          onOpenRecipe(dish.recipeId);
        }
      }}
    >
      <span className="dish-pill-title">{dish.title}</span>
      <span className="dish-pill-meta">{dish.slotName}</span>
    </button>
  );
}
