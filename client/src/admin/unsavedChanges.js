import { useEffect } from 'react';

// Forms with unsaved edits register here, so leaving the section (sidebar, log out) or the
// page can ask first instead of silently throwing the edits away.
const dirtyForms = new Set();

export function useUnsavedChanges(dirty) {
  useEffect(() => {
    if (!dirty) return;
    const token = {};
    dirtyForms.add(token);
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      dirtyForms.delete(token);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [dirty]);
}

// True when it's fine to leave: nothing unsaved, or the admin confirmed
export function confirmLeave() {
  return dirtyForms.size === 0 || window.confirm('You have unsaved changes on this page. Leave without saving them?');
}
