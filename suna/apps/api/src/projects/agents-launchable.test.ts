import { describe, expect, test } from 'bun:test';
import { type AgentSpec, type LoadedAgents, isLaunchableAgentName } from './agents';

function spec(name: string, enabled = true, mode?: AgentSpec['mode']): AgentSpec {
  return {
    name,
    path: `kortix.yaml#agents.${name}`,
    enabled,
    mode,
    connectors: 'all',
    permissions: 'all',
    env: 'all',
    model: null,
  };
}

const governed: LoadedAgents = {
  specs: [spec('galileo'), spec('galileo-admin'), spec('retired', false)],
  errors: [],
  defaultAgent: 'galileo',
};

describe('isLaunchableAgentName', () => {
  test('a declared, enabled agent is launchable', () => {
    expect(isLaunchableAgentName('galileo', governed)).toBe(true);
  });

  test('an agent another project declares is NOT launchable here', () => {
    // INC-2026-09-15: `chief-of-staff` (declared in a different project) was
    // written onto session tokens of unrelated projects.
    expect(isLaunchableAgentName('chief-of-staff', governed)).toBe(false);
  });

  test('a disabled agent is not launchable', () => {
    expect(isLaunchableAgentName('retired', governed)).toBe(false);
  });

  test('a declared subagent is NOT launchable: it only runs inside its caller session', () => {
    // The composer filters to primary agents, and the manifest declares the
    // specialists `mode: subagent`. A direct API/CLI create must refuse them
    // too: a session would boot a second computer for one lens.
    const roster: LoadedAgents = {
      specs: [spec('chief', true, 'primary'), spec('analyst', true, 'subagent'), spec('either', true, 'all'), spec('legacy', true)],
      errors: [],
      defaultAgent: 'chief',
    };
    expect(isLaunchableAgentName('chief', roster)).toBe(true);
    expect(isLaunchableAgentName('analyst', roster)).toBe(false);
    expect(isLaunchableAgentName('either', roster)).toBe(true);
    // No `mode` means `all` (manifest-schema default), never `subagent`.
    expect(isLaunchableAgentName('legacy', roster)).toBe(true);
  });

  test('the default sentinel is always launchable; My Kortix unless kortix.yaml turned it off', () => {
    expect(isLaunchableAgentName('default', governed)).toBe(true);
    expect(isLaunchableAgentName('meta', governed)).toBe(true);
    expect(isLaunchableAgentName('meta', { ...governed, builtinAgents: { my_kortix: true } })).toBe(true);
    expect(isLaunchableAgentName('meta', { ...governed, builtinAgents: { my_kortix: false } })).toBe(false);
  });

  test("OpenCode's build/plan/general/explore are not launchable in a governed project unless declared", () => {
    for (const name of ['build', 'plan', 'general', 'explore']) {
      expect(isLaunchableAgentName(name, governed)).toBe(false);
    }
    expect(isLaunchableAgentName('plan', { ...governed, specs: [...governed.specs, spec('plan')] })).toBe(true);
  });

  test('the runtime-internal agents and the default sentinel stay launchable', () => {
    for (const name of ['compaction', 'summary', 'title', 'default']) expect(isLaunchableAgentName(name, governed)).toBe(true);
  });

  test('a project with no per-agent governance keeps the runtime roster as the authority', () => {
    expect(isLaunchableAgentName('anything', { specs: [], errors: [] })).toBe(true);
  });

  test('a manifest that failed to parse proves nothing: fail closed', () => {
    const broken: LoadedAgents = {
      specs: [],
      errors: [{ name: '(manifest)', path: 'kortix.yaml', error: 'bad yaml' }],
    };
    expect(isLaunchableAgentName('chief-of-staff', broken)).toBe(false);
  });

  test('names are compared exactly after trimming', () => {
    expect(isLaunchableAgentName('  galileo ', governed)).toBe(true);
    expect(isLaunchableAgentName('Galileo', governed)).toBe(false);
    expect(isLaunchableAgentName('', governed)).toBe(false);
  });
});
