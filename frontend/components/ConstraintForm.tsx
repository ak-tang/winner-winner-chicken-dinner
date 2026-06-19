'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { generateMenu, listVibeTags, type MenuConstraints } from '@/lib/api';

const COURSE_OPTIONS = [
  { key: 'appetizer', label: 'Appetizer', emoji: '🥗' },
  { key: 'main', label: 'Main Course', emoji: '🍽️' },
  { key: 'dessert', label: 'Dessert', emoji: '🍮' },
  { key: 'drink', label: 'Drink / Cocktail', emoji: '🍷' },
] as const;

const COMMON_CUISINES = [
  'Italian', 'French', 'Japanese', 'Mexican', 'Indian',
  'Mediterranean', 'Thai', 'American', 'Chinese', 'Spanish',
];

const COMMON_RESTRICTIONS = [
  'Vegetarian', 'Vegan', 'Gluten-free', 'Dairy-free', 'Nut-free', 'Halal', 'Kosher', 'Low-carb',
];

const SEASONS = ['Spring', 'Summer', 'Fall', 'Winter'];

const BUDGET_OPTIONS = [
  { value: 'budget', label: 'Budget', sub: 'under $15/person' },
  { value: 'mid', label: 'Mid-range', sub: '$15–40/person' },
  { value: 'expensive', label: 'Splurge', sub: '$40+/person' },
];

const EQUIPMENT_OPTIONS = [
  'Grill', 'Slow cooker', 'Stand mixer', 'Food processor', 'Deep fryer', 'Instant pot',
];

const STEPS = ['Courses', 'Cuisine & Vibe', 'Dietary Needs', 'Party Details'];

type CourseKey = 'appetizer' | 'main' | 'dessert' | 'drink';

interface CourseSelection {
  selected: boolean;
  quantity: number;
}

interface FormState {
  courses: Record<CourseKey, CourseSelection>;
  cuisines: string[];
  customCuisine: string;
  occasion: string;
  vibePills: string[];
  vibeCustom: string;
  season: string;
  location: string;
  dietary_restrictions: string[];
  allergies: string;
  must_have_ingredients: string;
  guest_count: number;
  time_mode: 'total' | 'split' | 'none';
  total_time_minutes: number;
  prep_time_minutes: number;
  cook_time_minutes: number;
  budget_per_person: string;
  equipment_unavailable: string[];
}

const defaultForm: FormState = {
  courses: {
    appetizer: { selected: false, quantity: 1 },
    main: { selected: true, quantity: 1 },
    dessert: { selected: false, quantity: 1 },
    drink: { selected: false, quantity: 1 },
  },
  cuisines: [],
  customCuisine: '',
  occasion: '',
  vibePills: [],
  vibeCustom: '',
  season: '',
  location: '',
  dietary_restrictions: [],
  allergies: '',
  must_have_ingredients: '',
  guest_count: 4,
  time_mode: 'none',
  total_time_minutes: 90,
  prep_time_minutes: 30,
  cook_time_minutes: 60,
  budget_per_person: '',
  equipment_unavailable: [],
};

export default function ConstraintForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dbVibeTags, setDbVibeTags] = useState<string[]>([]);

  useEffect(() => {
    listVibeTags().then(setDbVibeTags).catch(() => {});
  }, []);

  const toggleCourse = (key: CourseKey) =>
    setForm(f => ({ ...f, courses: { ...f.courses, [key]: { ...f.courses[key], selected: !f.courses[key].selected } } }));

  const setCourseQty = (key: CourseKey, qty: number) =>
    setForm(f => ({ ...f, courses: { ...f.courses, [key]: { ...f.courses[key], quantity: Math.max(1, qty) } } }));

  const toggleCuisine = (c: string) =>
    setForm(f => ({ ...f, cuisines: f.cuisines.includes(c) ? f.cuisines.filter(x => x !== c) : [...f.cuisines, c] }));

  const addCustomCuisine = () => {
    const val = form.customCuisine.trim();
    if (val && !form.cuisines.includes(val))
      setForm(f => ({ ...f, cuisines: [...f.cuisines, val], customCuisine: '' }));
  };

  const toggleRestriction = (r: string) =>
    setForm(f => ({
      ...f,
      dietary_restrictions: f.dietary_restrictions.includes(r)
        ? f.dietary_restrictions.filter(x => x !== r)
        : [...f.dietary_restrictions, r],
    }));

  const toggleVibePill = (v: string) =>
    setForm(f => ({
      ...f,
      vibePills: f.vibePills.includes(v) ? f.vibePills.filter(x => x !== v) : [...f.vibePills, v],
    }));

  const toggleEquipment = (e: string) =>
    setForm(f => ({
      ...f,
      equipment_unavailable: f.equipment_unavailable.includes(e)
        ? f.equipment_unavailable.filter(x => x !== e)
        : [...f.equipment_unavailable, e],
    }));

  const canProceed = () => step !== 0 || Object.values(form.courses).some(c => c.selected);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    const courses = COURSE_OPTIONS
      .filter(o => form.courses[o.key].selected)
      .map(o => ({ course_type: o.key, quantity: form.courses[o.key].quantity }));

    const constraints: MenuConstraints = {
      courses,
      cuisines: form.cuisines,
      dietary_restrictions: form.dietary_restrictions,
      allergies: form.allergies.split(',').map(s => s.trim()).filter(Boolean),
      must_have_ingredients: form.must_have_ingredients.split(',').map(s => s.trim()).filter(Boolean),
      guest_count: form.guest_count,
      prep_time_minutes: form.time_mode === 'split' ? form.prep_time_minutes : null,
      cook_time_minutes: form.time_mode === 'split' ? form.cook_time_minutes : null,
      total_time_minutes: form.time_mode === 'total' ? form.total_time_minutes : null,
      occasion: form.occasion || null,
      vibe: [...form.vibePills, form.vibeCustom.trim()].filter(Boolean).join(', ') || null,
      season: form.season.toLowerCase() || null,
      location: form.location || null,
      budget_per_person: form.budget_per_person || null,
      equipment_unavailable: form.equipment_unavailable.map(e => e.toLowerCase().replace(' ', '-')),
    };

    try {
      const menu = await generateMenu(constraints);
      sessionStorage.setItem(`menu:${menu.id}`, JSON.stringify(menu));
      router.push(`/menu/${menu.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
      {/* Step indicator */}
      <div className="flex border-b border-stone-100">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={`flex-1 py-3 text-center text-sm font-medium transition-colors cursor-default ${
              i === step
                ? 'bg-green-50 text-green-800 border-b-2 border-green-700'
                : i < step
                ? 'text-green-600 cursor-pointer hover:bg-stone-50'
                : 'text-stone-400'
            }`}
            onClick={() => i < step && setStep(i)}
          >
            {i < step ? '✓ ' : ''}{s}
          </div>
        ))}
      </div>

      <div className="p-8">

        {/* Step 0: Courses */}
        {step === 0 && (
          <div>
            <h2 className="text-xl font-semibold text-stone-800 mb-1">Which courses?</h2>
            <p className="text-stone-500 text-sm mb-6">Select the courses you want to serve.</p>
            <div className="space-y-3">
              {COURSE_OPTIONS.map(({ key, label, emoji }) => (
                <div
                  key={key}
                  className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    form.courses[key].selected ? 'border-green-600 bg-green-50' : 'border-stone-200 hover:border-stone-300'
                  }`}
                  onClick={() => toggleCourse(key)}
                >
                  <span className="text-2xl">{emoji}</span>
                  <span className="flex-1 font-medium text-stone-800">{label}</span>
                  {form.courses[key].selected && (
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <button className="w-7 h-7 rounded-full bg-green-100 text-green-800 font-bold hover:bg-green-200 flex items-center justify-center" onClick={() => setCourseQty(key, form.courses[key].quantity - 1)}>−</button>
                      <span className="w-6 text-center font-semibold text-stone-800">{form.courses[key].quantity}</span>
                      <button className="w-7 h-7 rounded-full bg-green-100 text-green-800 font-bold hover:bg-green-200 flex items-center justify-center" onClick={() => setCourseQty(key, form.courses[key].quantity + 1)}>+</button>
                    </div>
                  )}
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${form.courses[key].selected ? 'bg-green-600 border-green-600' : 'border-stone-300'}`}>
                    {form.courses[key].selected && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                      </svg>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Cuisine & Vibe */}
        {step === 1 && (
          <div>
            <h2 className="text-xl font-semibold text-stone-800 mb-1">Cuisine & vibe</h2>
            <p className="text-stone-500 text-sm mb-6">Set the flavor direction and atmosphere.</p>

            <div className="mb-5">
              <label className="block text-sm font-medium text-stone-700 mb-2">Cuisine (pick any)</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {COMMON_CUISINES.map(c => (
                  <button key={c} onClick={() => toggleCuisine(c)} className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${form.cuisines.includes(c) ? 'bg-green-700 text-white border-green-700' : 'bg-white text-stone-600 border-stone-300 hover:border-green-400'}`}>{c}</button>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="text" placeholder="Other cuisine..." value={form.customCuisine} onChange={e => setForm(f => ({ ...f, customCuisine: e.target.value }))} onKeyDown={e => e.key === 'Enter' && addCustomCuisine()} className="flex-1 px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400" />
                <button onClick={addCustomCuisine} className="px-4 py-2 text-sm bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200">Add</button>
              </div>
              {form.cuisines.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {form.cuisines.map(c => (
                    <span key={c} className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">{c}<button onClick={() => toggleCuisine(c)} className="hover:text-green-600">×</button></span>
                  ))}
                </div>
              )}
            </div>

            <div className="mb-5">
              <label className="block text-sm font-medium text-stone-700 mb-1">Occasion</label>
              <input type="text" placeholder="e.g. Birthday dinner, casual weeknight, anniversary..." value={form.occasion} onChange={e => setForm(f => ({ ...f, occasion: e.target.value }))} className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>

            <div className="mb-5">
              <label className="block text-sm font-medium text-stone-700 mb-2">Desired vibe</label>
              {dbVibeTags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {dbVibeTags.map(v => (
                    <button
                      key={v}
                      onClick={() => toggleVibePill(v)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border capitalize transition-all ${
                        form.vibePills.includes(v)
                          ? 'bg-purple-700 text-white border-purple-700'
                          : 'bg-white text-stone-600 border-stone-300 hover:border-purple-400'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              )}
              <input
                type="text"
                placeholder="Or describe in your own words…"
                value={form.vibeCustom}
                onChange={e => setForm(f => ({ ...f, vibeCustom: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>

            <div className="mb-5">
              <label className="block text-sm font-medium text-stone-700 mb-2">Season <span className="text-stone-400 font-normal">(for seasonal ingredients)</span></label>
              <div className="flex gap-2 flex-wrap">
                {SEASONS.map(s => (
                  <button key={s} onClick={() => setForm(f => ({ ...f, season: f.season === s ? '' : s }))} className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${form.season === s ? 'bg-green-700 text-white border-green-700' : 'bg-white text-stone-600 border-stone-300 hover:border-green-400'}`}>{s}</button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Location <span className="text-stone-400 font-normal">(for regional seasonal produce)</span></label>
              <input type="text" placeholder="e.g. California, New York, Tokyo..." value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
          </div>
        )}

        {/* Step 2: Dietary */}
        {step === 2 && (
          <div>
            <h2 className="text-xl font-semibold text-stone-800 mb-1">Dietary needs</h2>
            <p className="text-stone-500 text-sm mb-6">Any restrictions, allergies, or must-have ingredients?</p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-stone-700 mb-2">Dietary restrictions</label>
              <div className="flex flex-wrap gap-2">
                {COMMON_RESTRICTIONS.map(r => (
                  <button key={r} onClick={() => toggleRestriction(r)} className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${form.dietary_restrictions.includes(r) ? 'bg-green-700 text-white border-green-700' : 'bg-white text-stone-600 border-stone-300 hover:border-green-400'}`}>{r}</button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-stone-700 mb-1">Allergies</label>
              <p className="text-xs text-stone-400 mb-2">Comma-separated</p>
              <input type="text" placeholder="e.g. peanuts, shellfish, tree nuts" value={form.allergies} onChange={e => setForm(f => ({ ...f, allergies: e.target.value }))} className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Must-have ingredients</label>
              <p className="text-xs text-stone-400 mb-2">Comma-separated</p>
              <input type="text" placeholder="e.g. truffle, lobster, seasonal tomatoes" value={form.must_have_ingredients} onChange={e => setForm(f => ({ ...f, must_have_ingredients: e.target.value }))} className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
          </div>
        )}

        {/* Step 3: Party Details */}
        {step === 3 && (
          <div>
            <h2 className="text-xl font-semibold text-stone-800 mb-1">Party details</h2>
            <p className="text-stone-500 text-sm mb-6">Guests, time, budget, and your kitchen setup.</p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-stone-700 mb-2">Number of guests</label>
              <div className="flex items-center gap-3">
                <button className="w-9 h-9 rounded-full bg-stone-100 text-stone-800 font-bold hover:bg-stone-200 flex items-center justify-center" onClick={() => setForm(f => ({ ...f, guest_count: Math.max(1, f.guest_count - 1) }))}>−</button>
                <span className="text-2xl font-bold text-green-900 w-10 text-center">{form.guest_count}</span>
                <button className="w-9 h-9 rounded-full bg-stone-100 text-stone-800 font-bold hover:bg-stone-200 flex items-center justify-center" onClick={() => setForm(f => ({ ...f, guest_count: f.guest_count + 1 }))}>+</button>
                <span className="text-stone-500 text-sm">guests</span>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-stone-700 mb-3">Time constraints</label>
              <div className="space-y-2 mb-4">
                {(['none', 'total', 'split'] as const).map(mode => (
                  <label key={mode} className="flex items-center gap-3 cursor-pointer">
                    <input type="radio" name="time_mode" checked={form.time_mode === mode} onChange={() => setForm(f => ({ ...f, time_mode: mode }))} className="accent-green-700" />
                    <span className="text-sm text-stone-700">
                      {mode === 'none' && 'No time limit'}
                      {mode === 'total' && 'Total time limit'}
                      {mode === 'split' && 'Separate prep & cook limits'}
                    </span>
                  </label>
                ))}
              </div>
              {form.time_mode === 'total' && (
                <div className="pl-6">
                  <label className="block text-xs text-stone-500 mb-1">Total time (minutes)</label>
                  <input type="number" min={1} value={form.total_time_minutes} onChange={e => setForm(f => ({ ...f, total_time_minutes: Number(e.target.value) }))} className="w-32 px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400" />
                </div>
              )}
              {form.time_mode === 'split' && (
                <div className="pl-6 flex gap-4">
                  <div>
                    <label className="block text-xs text-stone-500 mb-1">Prep (min)</label>
                    <input type="number" min={1} value={form.prep_time_minutes} onChange={e => setForm(f => ({ ...f, prep_time_minutes: Number(e.target.value) }))} className="w-28 px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400" />
                  </div>
                  <div>
                    <label className="block text-xs text-stone-500 mb-1">Cook (min)</label>
                    <input type="number" min={1} value={form.cook_time_minutes} onChange={e => setForm(f => ({ ...f, cook_time_minutes: Number(e.target.value) }))} className="w-28 px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400" />
                  </div>
                </div>
              )}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-stone-700 mb-2">Budget per person</label>
              <div className="flex gap-2 flex-wrap">
                {BUDGET_OPTIONS.map(b => (
                  <button
                    key={b.value}
                    onClick={() => setForm(f => ({ ...f, budget_per_person: f.budget_per_person === b.value ? '' : b.value }))}
                    className={`flex flex-col items-start px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${form.budget_per_person === b.value ? 'bg-green-700 text-white border-green-700' : 'bg-white text-stone-700 border-stone-200 hover:border-green-400'}`}
                  >
                    <span>{b.label}</span>
                    <span className={`text-xs font-normal ${form.budget_per_person === b.value ? 'text-green-100' : 'text-stone-400'}`}>{b.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">Equipment you <span className="italic">don&apos;t</span> have</label>
              <div className="flex flex-wrap gap-2">
                {EQUIPMENT_OPTIONS.map(e => (
                  <button key={e} onClick={() => toggleEquipment(e)} className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${form.equipment_unavailable.includes(e) ? 'bg-red-50 text-red-700 border-red-300' : 'bg-white text-stone-600 border-stone-300 hover:border-stone-400'}`}>{e}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
        )}

        {/* Navigation */}
        <div className="mt-8 flex gap-3 justify-between">
          <button onClick={() => setStep(s => s - 1)} disabled={step === 0} className="px-5 py-2.5 rounded-xl border border-stone-300 text-stone-700 text-sm font-medium hover:bg-stone-50 disabled:opacity-0 disabled:pointer-events-none">Back</button>
          {step < STEPS.length - 1 ? (
            <button onClick={() => setStep(s => s + 1)} disabled={!canProceed()} className="px-6 py-2.5 rounded-xl bg-green-700 text-white text-sm font-medium hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Continue →</button>
          ) : (
            <button onClick={handleSubmit} disabled={loading} className="px-6 py-2.5 rounded-xl bg-green-700 text-white text-sm font-medium hover:bg-green-800 disabled:opacity-70 transition-colors flex items-center gap-2">
              {loading ? (
                <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Planning your menu…</>
              ) : 'Generate my menu ✨'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
