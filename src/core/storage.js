// LocalStorage manager for saving and loading problems

const PREFIX = "EMD_Resolucoes_Interativas_";

export function saveExercise(subject, name, state) {
  try {
    const key = `${PREFIX}${subject}_${name}`;
    localStorage.setItem(key, JSON.stringify(state));
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, error: e.message };
  }
}

export function loadExercise(subject, name) {
  try {
    const key = `${PREFIX}${subject}_${name}`;
    const data = localStorage.getItem(key);
    if (!data) return null;
    return JSON.parse(data);
  } catch (e) {
    console.error(e);
    return null;
  }
}

export function listExercises(subject) {
  const list = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`${PREFIX}${subject}_`)) {
        const name = key.slice((`${PREFIX}${subject}_`).length);
        list.push(name);
      }
    }
  } catch (e) {
    console.error(e);
  }
  return list;
}

export function deleteExercise(subject, name) {
  try {
    const key = `${PREFIX}${subject}_${name}`;
    localStorage.removeItem(key);
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}
