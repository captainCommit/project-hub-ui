import { useMemo } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useUserPref } from '@/lib/userPrefs';
import { useAccountHierarchy } from '@/hooks/useAccountLookups';

// The scope chosen in the top bar ("Viewing: 2026 Initiatives > Cloud Migration"): one portfolio, program or project
// that every module narrows to. It's kept per person and account in this browser, so it carries across pages.
// Page filters (the dropdowns on each page) narrow further inside it and never change it.

export const EMPTY_SCOPE = { portfolioId: null, programId: null, projectId: null };

const ALL = () => true;

/**
 * The global scope for the selected account.
 * scope / setScope / resetScope: the stored choice. active: whether anything is chosen.
 * parts: the chosen portfolio, program and project records, for the "Viewing" label; ids: their ids (null when not chosen).
 * inScope(item): whether a record (a task, risk, decision...) falls inside it, by its project_id, program_id or portfolio_id.
 * scopeHierarchy({ portfolios, programs, projects }): the lists narrowed to the scope.
 */
export function useGlobalScope() {
  const { selectedAccountId } = useAuth();
  const [stored, setScope] = useUserPref(`global_scope:${selectedAccountId || 'none'}`, EMPTY_SCOPE);
  const { portfolios, programs, projects, isLoading } = useAccountHierarchy();

  return useMemo(() => {
    const scope = { ...EMPTY_SCOPE, ...(stored || {}) };
    const project = scope.projectId ? projects.find(p => p.id === scope.projectId) : null;
    const program = programs.find(p => p.id === (project ? project.program_id : scope.programId)) || null;
    const portfolioId = program?.portfolio_id || project?.portfolio_id || scope.portfolioId;
    const portfolio = portfolioId ? portfolios.find(p => p.id === portfolioId) || null : null;

    // A choice that no longer exists (deleted, or another account's) counts as no choice.
    const active = !isLoading && !!(project || (scope.programId && program) || (scope.portfolioId && portfolio));
    const resetScope = () => setScope(EMPTY_SCOPE);
    if (!active) {
      return {
        scope, setScope, resetScope, active: false, parts: [], ids: EMPTY_SCOPE, inScope: ALL,
        scopeHierarchy: (lists) => lists,
      };
    }

    let projectIds; let programIds; let portfolioIds;
    if (project) {
      projectIds = new Set([project.id]);
      programIds = new Set(program ? [program.id] : []);
      portfolioIds = new Set(portfolio ? [portfolio.id] : []);
    } else if (scope.programId) {
      programIds = new Set([program.id]);
      projectIds = new Set(projects.filter(p => p.program_id === program.id).map(p => p.id));
      portfolioIds = new Set(portfolio ? [portfolio.id] : []);
    } else {
      portfolioIds = new Set([portfolio.id]);
      programIds = new Set(programs.filter(p => p.portfolio_id === portfolio.id).map(p => p.id));
      projectIds = new Set(projects.filter(p => p.portfolio_id === portfolio.id || programIds.has(p.program_id)).map(p => p.id));
    }

    // Records point at a project, else a program, else a portfolio. With a project chosen, program-level records are out.
    const inScope = (item) => {
      if (!item) return false;
      if (item.project_id) return projectIds.has(item.project_id);
      if (project) return false;
      if (item.program_id) return programIds.has(item.program_id);
      if (item.portfolio_id) return portfolioIds.has(item.portfolio_id);
      return false;
    };

    const chosenProgram = scope.programId || project ? program : null;
    return {
      scope, setScope, resetScope, active: true,
      parts: [portfolio, chosenProgram, project].filter(Boolean),
      ids: { portfolioId: portfolio?.id || null, programId: chosenProgram?.id || null, projectId: project?.id || null },
      inScope,
      scopeHierarchy: ({ portfolios: ports = [], programs: progs = [], projects: projs = [], ...rest }) => ({
        ...rest,
        portfolios: ports.filter(p => portfolioIds.has(p.id)),
        programs: progs.filter(p => programIds.has(p.id)),
        projects: projs.filter(p => projectIds.has(p.id)),
      }),
    };
  }, [stored, setScope, portfolios, programs, projects, isLoading]);
}
