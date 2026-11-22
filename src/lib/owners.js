// A portfolio can have several owners. They're kept in its one `owner` field as "Name, Name", so every screen that
// shows the owner as text keeps working; these split and join that list.

export const splitOwners = (owner) => String(owner || '').split(',').map(name => name.trim()).filter(Boolean);

export const joinOwners = (names) => names.map(name => name.trim()).filter(Boolean).join(', ');
