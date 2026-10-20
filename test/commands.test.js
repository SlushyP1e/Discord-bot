import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

const commandsRoot = path.join(import.meta.dirname, '..', 'src', 'commands');

test('every command file exports a usable command', async () => {
  const names = new Set();

  for (const category of readdirSync(commandsRoot, { withFileTypes: true })) {
    if (!category.isDirectory()) continue;
    const dir = path.join(commandsRoot, category.name);

    for (const file of readdirSync(dir)) {
      if (!file.endsWith('.js') || file.startsWith('_')) continue;

      const mod = (await import(pathToFileURL(path.join(dir, file)))).default;
      assert.ok(mod, `${category.name}/${file} has no default export`);

      for (const command of Array.isArray(mod) ? mod : [mod]) {
        assert.ok(command?.data?.name, `${category.name}/${file} has no command data`);
        assert.equal(typeof command.execute, 'function', `${category.name}/${file} has no execute()`);
        assert.ok(!names.has(command.data.name), `duplicate command name: ${command.data.name}`);
        names.add(command.data.name);
      }
    }
  }
});
