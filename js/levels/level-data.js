// All 22 level definitions
// Each level: { title, world, description, objectives: [{text, check(state)}], hints: [], concepts: [], setup(engine) }

export const levels = [

  // Lesson 0: onboarding
  {
    title: 'Orientation: The Git Map',
    world: 'Onboarding',
    description: 'This is Lesson 0. Understand the simulator layout, the four Git zones, and how commands move information through Git.',
    beforeLesson: 'You are starting fresh. No Git knowledge is assumed.',
    afterLesson: 'You will be able to explain HEAD, branch pointer, working directory, staging area, and commit history in one flow.',
    objectives: [
      {
        text: 'Run git init to create your first repo context',
        check: (state) => state.initialized,
      },
    ],
    hints: [
      'Type <code>help</code> once to review available commands.',
      'Then run <code>git init</code> to complete Lesson 0.',
      'Watch the clarity panel and repo-state cards as you run commands in later lessons.',
    ],
    concepts: [
      'Think in 4 zones: <strong>Working Directory</strong> (edited files), <strong>Staging Area</strong> (next snapshot), <strong>HEAD</strong> (current commit), and <strong>Branch</strong> (pointer to commit).',
      'Core loop: edit file -> <code>git add</code> -> <code>git commit</code> -> history advances.',
      'Use this simulator like a lab: predict first, run command, then read state changes.',
    ],
    setup: () => {},
  },

  // ══════════════════════════════════════
  // WORLD 1: BASICS (Levels 1-6)
  // ══════════════════════════════════════

  // Level 1: git init
  {
    title: 'Initialize a Repository',
    world: 'World 1: Basics',
    description: 'Every Git project starts with initialization. Create your first Git repository using the git init command.',
    objectives: [
      {
        text: 'Run git init to create a repository',
        check: (state) => state.initialized,
      },
    ],
    hints: [
      'Type <code>git init</code> and press Enter.',
    ],
    concepts: [
      '<code>git init</code> creates a new Git repository. It sets up the internal data structures Git needs to track your files.',
      'After init, Git creates a hidden <code>.git</code> directory that stores all version history.',
    ],
    setup: () => {},
  },

  // Level 2: Create files & git add
  {
    title: 'Stage Your First File',
    world: 'World 1: Basics',
    description: 'Git doesn\'t automatically track files. You need to explicitly tell Git which files to track using git add. First, create a file, then stage it.',
    objectives: [
      {
        text: 'Create a file called hello.txt',
        check: (state) => state.workingDirectory.exists('hello.txt'),
      },
      {
        text: 'Stage hello.txt with git add',
        check: (state) => state.stagingArea.has('hello.txt'),
      },
    ],
    hints: [
      'Use <code>echo "hello world" > hello.txt</code> to create a file.',
      'Then use <code>git add hello.txt</code> to stage it.',
    ],
    concepts: [
      'The <strong>staging area</strong> (also called the index) is a preparation zone. Files in staging are ready to be committed.',
      '<code>git add</code> copies a snapshot of the file into the staging area.',
    ],
    setup: (engine) => {
      engine.initialized = true;
      engine.branchManager.init('main');
    },
  },

  // Level 3: git commit
  {
    title: 'Make Your First Commit',
    world: 'World 1: Basics',
    description: 'A commit is a snapshot of your project at a point in time. Create a file, stage it, and commit it with a message.',
    objectives: [
      {
        text: 'Create a file',
        check: (state) => state.workingDirectory.listFiles().length > 0,
      },
      {
        text: 'Stage the file with git add',
        check: (state) => !state.stagingArea.isEmpty(),
      },
      {
        text: 'Commit with git commit -m "your message"',
        check: (state) => state.commits.length >= 1,
      },
    ],
    hints: [
      'Create a file: <code>echo "my project" > readme.txt</code>',
      'Stage it: <code>git add readme.txt</code>',
      'Commit: <code>git commit -m "initial commit"</code>',
    ],
    concepts: [
      'A <strong>commit</strong> saves a snapshot of all staged changes with a message describing what changed.',
      'The <code>-m</code> flag lets you write the commit message inline.',
      'Each commit gets a unique ID and points back to its parent commit.',
    ],
    setup: (engine) => {
      engine.initialized = true;
      engine.branchManager.init('main');
    },
  },

  // Level 4: git status
  {
    title: 'Check Repository Status',
    world: 'World 1: Basics',
    description: 'Use git status to understand the state of your working directory and staging area. Create files in different states and observe.',
    objectives: [
      {
        text: 'Make a commit with at least one file',
        check: (state) => state.commits.length >= 1,
      },
      {
        text: 'Create a new untracked file',
        check: (state) => {
          if (state.commits.length === 0) return false;
          const committed = state.mergeEngine.getFilesAtCommit(state.headCommitId);
          for (const path of state.workingDirectory.listFiles()) {
            if (!committed.has(path) && !state.stagingArea.has(path)) return true;
          }
          return false;
        },
      },
    ],
    hints: [
      'First commit a file: <code>echo "v1" > app.js</code> then <code>git add app.js</code> then <code>git commit -m "add app"</code>',
      'Then create another file: <code>touch notes.txt</code>',
      'Run <code>git status</code> to see the different states!',
    ],
    concepts: [
      '<code>git status</code> shows three categories: staged changes (green), unstaged changes (red), and untracked files.',
      'Files go through states: <strong>untracked → staged → committed</strong>',
    ],
    setup: (engine) => {
      engine.initialized = true;
      engine.branchManager.init('main');
    },
  },

  // Level 5: git log
  {
    title: 'View Commit History',
    world: 'World 1: Basics',
    description: 'The commit log shows the history of your project. Make multiple commits and explore the log.',
    objectives: [
      {
        text: 'Create at least 3 commits',
        check: (state) => state.commits.length >= 3,
      },
    ],
    hints: [
      'Create and commit files one at a time:',
      '<code>echo "file1" > a.txt</code> → <code>git add a.txt</code> → <code>git commit -m "first"</code>',
      'Repeat with different files. Then run <code>git log</code> or <code>git log --oneline</code>',
    ],
    concepts: [
      '<code>git log</code> shows commits from newest to oldest.',
      '<code>git log --oneline</code> shows a compact single-line format.',
      'Each commit stores: ID, author, date, message, and a pointer to its parent.',
    ],
    setup: (engine) => {
      engine.initialized = true;
      engine.branchManager.init('main');
    },
  },

  // Level 6: git diff
  {
    title: 'See What Changed',
    world: 'World 1: Basics',
    description: 'Use git diff to see exactly what changed in your files. Make changes and explore the diff output.',
    objectives: [
      {
        text: 'Make a commit',
        check: (state) => state.commits.length >= 1,
      },
      {
        text: 'Modify a committed file (change its content)',
        check: (state) => {
          if (state.commits.length === 0) return false;
          const committed = state.mergeEngine.getFilesAtCommit(state.headCommitId);
          for (const [path, content] of committed) {
            if (state.workingDirectory.exists(path) && state.workingDirectory.readFile(path) !== content) {
              return true;
            }
          }
          return false;
        },
      },
    ],
    hints: [
      'First: <code>echo "version 1" > file.txt</code> → <code>git add file.txt</code> → <code>git commit -m "v1"</code>',
      'Then modify: <code>echo "version 2" > file.txt</code>',
      'Run <code>git diff</code> to see the changes! Use <code>git diff --staged</code> after staging.',
    ],
    concepts: [
      '<code>git diff</code> shows unstaged changes (working directory vs staging area).',
      '<code>git diff --staged</code> shows what will be included in the next commit.',
      'Lines starting with <code>+</code> are additions, <code>-</code> are deletions.',
    ],
    setup: (engine) => {
      engine.initialized = true;
      engine.branchManager.init('main');
    },
  },

  // ══════════════════════════════════════
  // WORLD 2: BRANCHING (Levels 7-12)
  // ══════════════════════════════════════

  // Level 7: git branch
  {
    title: 'Create a Branch',
    world: 'World 2: Branching',
    description: 'Branches let you work on features without affecting the main code. Create your first branch!',
    objectives: [
      {
        text: 'Create a branch called "feature"',
        check: (state) => state.branchManager.hasBranch('feature'),
      },
    ],
    hints: [
      'First make sure you have at least one commit.',
      'Then run <code>git branch feature</code> to create the branch.',
      'Use <code>git branch</code> (no args) to list all branches.',
    ],
    concepts: [
      'A <strong>branch</strong> is just a pointer to a commit. Creating a branch is instant and cheap.',
      'The <code>main</code> branch is the default. New branches start at the current commit.',
      'The <code>*</code> next to a branch name means it\'s the current (checked-out) branch.',
    ],
    setup: (engine) => {
      engine.initialized = true;
      engine.branchManager.init('main');
      // Pre-create a commit
      engine.workingDirectory.writeFile('readme.txt', 'My Project');
      engine.execute('add', ['readme.txt']);
      engine.execute('commit', [], { '-m': 'initial commit' });
    },
  },

  // Level 8: git checkout / switch
  {
    title: 'Switch Branches',
    world: 'World 2: Branching',
    description: 'Switch between branches to work on different features. Learn both checkout and switch.',
    objectives: [
      {
        text: 'Create a branch called "develop"',
        check: (state) => state.branchManager.hasBranch('develop'),
      },
      {
        text: 'Switch to the "develop" branch',
        check: (state) => state.currentBranch === 'develop',
      },
    ],
    hints: [
      'Create: <code>git branch develop</code>',
      'Switch: <code>git checkout develop</code> or <code>git switch develop</code>',
      'Shortcut: <code>git checkout -b develop</code> creates AND switches in one command!',
    ],
    concepts: [
      '<code>git checkout &lt;branch&gt;</code> switches to that branch and updates your files.',
      '<code>git switch &lt;branch&gt;</code> is the newer, simpler command for switching.',
      '<code>git checkout -b &lt;name&gt;</code> or <code>git switch -c &lt;name&gt;</code> creates and switches in one step.',
    ],
    setup: (engine) => {
      engine.initialized = true;
      engine.branchManager.init('main');
      engine.workingDirectory.writeFile('readme.txt', 'My Project');
      engine.execute('add', ['readme.txt']);
      engine.execute('commit', [], { '-m': 'initial commit' });
    },
  },

  // Level 9: Commits on branches
  {
    title: 'Work on a Branch',
    world: 'World 2: Branching',
    description: 'Make commits on a feature branch. Watch how the branch pointer moves forward while main stays behind.',
    objectives: [
      {
        text: 'Create and switch to a "feature" branch',
        check: (state) => state.branchManager.hasBranch('feature'),
      },
      {
        text: 'Make at least 2 commits on the feature branch',
        check: (state) => {
          const featureCommit = state.branchManager.getBranchCommit('feature');
          const mainCommit = state.branchManager.getBranchCommit('main');
          if (!featureCommit || featureCommit === mainCommit) return false;
          // Count commits ahead of main
          let count = 0;
          let id = featureCommit;
          while (id && id !== mainCommit) {
            count++;
            const c = state.objectDatabase.get(id);
            if (!c || c.parentIds.length === 0) break;
            id = c.parentIds[0];
          }
          return count >= 2;
        },
      },
    ],
    hints: [
      '<code>git checkout -b feature</code> to create and switch.',
      'Make commits: <code>echo "feat1" > feat.txt</code> → <code>git add feat.txt</code> → <code>git commit -m "add feature"</code>',
      'Watch the graph — notice how "feature" moves forward while "main" stays!',
    ],
    concepts: [
      'When you commit on a branch, only that branch pointer moves forward.',
      'Other branches stay where they were, preserving their state.',
      'This is how Git enables parallel development — each branch is independent.',
    ],
    setup: (engine) => {
      engine.initialized = true;
      engine.branchManager.init('main');
      engine.workingDirectory.writeFile('readme.txt', 'My Project');
      engine.execute('add', ['readme.txt']);
      engine.execute('commit', [], { '-m': 'initial commit' });
    },
  },

  // Level 10: Fast-forward merge
  {
    title: 'Fast-Forward Merge',
    world: 'World 2: Branching',
    description: 'When main hasn\'t moved since you branched, Git can "fast-forward" — just move the main pointer up. Try it!',
    objectives: [
      {
        text: 'Switch back to main',
        check: (state) => state.currentBranch === 'main',
      },
      {
        text: 'Merge the feature branch into main',
        check: (state) => {
          const mainCommit = state.branchManager.getBranchCommit('main');
          return mainCommit !== 'c1'; // main has advanced
        },
      },
    ],
    hints: [
      'First switch to main: <code>git checkout main</code>',
      'Then merge: <code>git merge feature</code>',
      'Watch the graph — main jumps forward to where feature was!',
    ],
    concepts: [
      'A <strong>fast-forward merge</strong> happens when the target branch is directly ahead.',
      'Git simply moves the branch pointer forward — no new merge commit is created.',
      'This is the simplest type of merge and results in a clean, linear history.',
    ],
    setup: (engine) => {
      engine.initialized = true;
      engine.branchManager.init('main');
      engine.workingDirectory.writeFile('readme.txt', 'My Project');
      engine.execute('add', ['readme.txt']);
      engine.execute('commit', [], { '-m': 'initial commit' });
      // Create feature branch with commits
      engine.execute('checkout', ['feature'], { '-b': true });
      engine.workingDirectory.writeFile('feature.txt', 'feature code');
      engine.execute('add', ['feature.txt']);
      engine.execute('commit', [], { '-m': 'add feature' });
      engine.workingDirectory.writeFile('feature2.txt', 'more features');
      engine.execute('add', ['feature2.txt']);
      engine.execute('commit', [], { '-m': 'more features' });
    },
  },

  // Level 11: 3-way merge
  {
    title: 'Three-Way Merge',
    world: 'World 2: Branching',
    description: 'When both branches have new commits, Git creates a merge commit that combines both histories. This is a 3-way merge.',
    objectives: [
      {
        text: 'Make a commit on main (you\'re already on main)',
        check: (state) => {
          const mainCommit = state.branchManager.getBranchCommit('main');
          return mainCommit !== 'c1';
        },
      },
      {
        text: 'Merge the feature branch into main',
        check: (state) => {
          // Check for a merge commit (commit with 2 parents)
          for (const c of state.commits) {
            if (c.parentIds.length === 2) return true;
          }
          return false;
        },
      },
    ],
    hints: [
      'First make a commit on main: <code>echo "hotfix" > hotfix.txt</code> → <code>git add hotfix.txt</code> → <code>git commit -m "hotfix"</code>',
      'Then merge: <code>git merge feature</code>',
      'Watch the graph — a new merge commit appears with TWO parent lines!',
    ],
    concepts: [
      'A <strong>3-way merge</strong> happens when both branches have diverged (both have new commits).',
      'Git finds the common ancestor, then combines changes from both branches.',
      'The result is a <strong>merge commit</strong> with two parents, preserving both histories.',
    ],
    setup: (engine) => {
      engine.initialized = true;
      engine.branchManager.init('main');
      engine.workingDirectory.writeFile('readme.txt', 'My Project');
      engine.execute('add', ['readme.txt']);
      engine.execute('commit', [], { '-m': 'initial commit' });
      // Create feature branch with a commit
      engine.execute('checkout', ['feature'], { '-b': true });
      engine.workingDirectory.writeFile('feature.txt', 'feature work');
      engine.execute('add', ['feature.txt']);
      engine.execute('commit', [], { '-m': 'feature work' });
      // Switch back to main
      engine.execute('checkout', ['main'], {});
    },
  },

  // Level 12: Merge conflicts
  {
    title: 'Resolve a Merge Conflict',
    world: 'World 2: Branching',
    description: 'When two branches modify the same file differently, Git can\'t auto-merge. You must resolve the conflict manually.',
    objectives: [
      {
        text: 'Try to merge — observe the conflict',
        check: (state) => state.merging || state.commits.some(c => c.parentIds.length === 2),
      },
      {
        text: 'Fix the conflicted file and commit the merge',
        check: (state) => state.commits.some(c => c.parentIds.length === 2),
      },
    ],
    hints: [
      'Run <code>git merge feature</code> — you\'ll see a conflict!',
      'Fix the file: <code>echo "resolved content" > shared.txt</code>',
      'Stage and commit: <code>git add shared.txt</code> → <code>git commit -m "resolve conflict"</code>',
    ],
    concepts: [
      'A <strong>merge conflict</strong> occurs when the same lines in a file were changed differently on two branches.',
      'Git marks conflicts with <code>&lt;&lt;&lt;&lt;&lt;&lt;&lt;</code>, <code>=======</code>, and <code>&gt;&gt;&gt;&gt;&gt;&gt;&gt;</code> markers.',
      'To resolve: edit the file to the desired content, <code>git add</code> it, then <code>git commit</code>.',
    ],
    setup: (engine) => {
      engine.initialized = true;
      engine.branchManager.init('main');
      // Shared file on main
      engine.workingDirectory.writeFile('shared.txt', 'original content');
      engine.execute('add', ['shared.txt']);
      engine.execute('commit', [], { '-m': 'add shared file' });
      // Feature branch modifies it
      engine.execute('checkout', ['feature'], { '-b': true });
      engine.workingDirectory.writeFile('shared.txt', 'feature version');
      engine.execute('add', ['shared.txt']);
      engine.execute('commit', [], { '-m': 'modify on feature' });
      // Main also modifies it
      engine.execute('checkout', ['main'], {});
      engine.workingDirectory.writeFile('shared.txt', 'main version');
      engine.execute('add', ['shared.txt']);
      engine.execute('commit', [], { '-m': 'modify on main' });
    },
  },

  // ══════════════════════════════════════
  // WORLD 3: REMOTE (Levels 13-18)
  // ══════════════════════════════════════

  // Level 13: git remote add
  {
    title: 'Add a Remote',
    world: 'World 3: Remote',
    description: 'Remotes are connections to other copies of your repository (like on GitHub). Add your first remote.',
    objectives: [
      {
        text: 'Add a remote called "origin"',
        check: (state) => state.remoteModel.hasRemote('origin'),
      },
    ],
    hints: [
      'Use <code>git remote add origin https://github.com/user/repo.git</code>',
      'Verify with <code>git remote</code> or <code>git remote -v</code>',
    ],
    concepts: [
      'A <strong>remote</strong> is a bookmark pointing to another copy of the repository.',
      '<code>origin</code> is the conventional name for the primary remote (usually where you cloned from).',
      'You can have multiple remotes (e.g., <code>origin</code>, <code>upstream</code>).',
    ],
    setup: (engine) => {
      engine.initialized = true;
      engine.branchManager.init('main');
      engine.workingDirectory.writeFile('readme.txt', 'My Project');
      engine.execute('add', ['readme.txt']);
      engine.execute('commit', [], { '-m': 'initial commit' });
    },
  },

  // Level 14: git clone
  {
    title: 'Clone a Repository',
    world: 'World 3: Remote',
    description: 'Cloning creates a local copy of a remote repository, complete with all history and an automatic "origin" remote.',
    objectives: [
      {
        text: 'Clone the remote repository',
        check: (state) => state.initialized && state.remoteModel.hasRemote('origin'),
      },
    ],
    hints: [
      'Use <code>git clone https://github.com/example/project.git</code>',
    ],
    concepts: [
      '<code>git clone</code> copies a remote repository to your machine.',
      'It automatically: downloads all history, sets up "origin" remote, checks out the default branch.',
      'After cloning, you have a complete, independent copy of the repository.',
    ],
    setup: (engine) => {
      // Don't initialize — clone will do that
      // Engine starts fresh (reset already happened in loadLevel)
    },
  },

  // Level 15: git push
  {
    title: 'Push to Remote',
    world: 'World 3: Remote',
    description: 'Push sends your local commits to the remote repository so others can see them.',
    objectives: [
      {
        text: 'Make at least 2 commits',
        check: (state) => state.commits.length >= 2,
      },
      {
        text: 'Push to origin',
        check: (state) => {
          if (!state.remoteModel.hasRemote('origin')) return false;
          const remote = state.remoteModel.getRemote('origin');
          return remote.branches.size > 0;
        },
      },
    ],
    hints: [
      'Make commits: <code>echo "code" > app.js</code> → <code>git add app.js</code> → <code>git commit -m "add app"</code>',
      'Push: <code>git push origin main</code> or <code>git push -u origin main</code>',
    ],
    concepts: [
      '<code>git push</code> uploads your commits to the remote repository.',
      '<code>git push -u origin main</code> sets up tracking, so future pushes just need <code>git push</code>.',
      'You can only push if you have new commits the remote doesn\'t have.',
    ],
    setup: (engine) => {
      engine.initialized = true;
      engine.branchManager.init('main');
      engine.workingDirectory.writeFile('readme.txt', 'My Project');
      engine.execute('add', ['readme.txt']);
      engine.execute('commit', [], { '-m': 'initial commit' });
      engine.remoteModel.addRemote('origin', 'https://github.com/user/repo.git');
    },
  },

  // Level 16: git fetch
  {
    title: 'Fetch Remote Changes',
    world: 'World 3: Remote',
    description: 'Fetch downloads new commits from the remote without changing your working directory. It\'s safe to run anytime.',
    objectives: [
      {
        text: 'Fetch from origin',
        check: (state) => {
          const trackingBranches = state.remoteModel.listTrackingBranches();
          return trackingBranches.length > 0;
        },
      },
    ],
    hints: [
      'Run <code>git fetch origin</code> to download remote changes.',
      'After fetching, check <code>git log --oneline</code> to see new commits.',
    ],
    concepts: [
      '<code>git fetch</code> downloads commits from the remote but doesn\'t merge them.',
      'Remote commits appear as <strong>tracking branches</strong> (e.g., <code>origin/main</code>).',
      'Fetch is always safe — it never changes your local branches or working directory.',
    ],
    setup: (engine) => {
      engine.initialized = true;
      engine.branchManager.init('main');
      engine.workingDirectory.writeFile('readme.txt', 'My Project');
      engine.execute('add', ['readme.txt']);
      engine.execute('commit', [], { '-m': 'initial commit' });
      engine.remoteModel.addRemote('origin', 'https://github.com/user/repo.git');
      // Add some commits to the remote
      const remote = engine.remoteModel.getRemote('origin');
      // Copy local objects to remote, then add more
      remote.receiveObjects(engine.objectDatabase, [engine.branchManager.headCommitId()]);
      remote.branches.set('main', engine.branchManager.headCommitId());

      // Add a new commit on the remote
      const { Blob, Tree, Commit, nextBlobId, nextTreeId, nextCommitId } = await_imports();
      const blob = new (getBlob())(nextBlobIdFn(), 'remote change');
      remote.objectDatabase.store(blob);
      const tree = new (getTree())(nextTreeIdFn(), new Map([['readme.txt', 'b1'], ['remote-file.txt', blob.id]]));
      remote.objectDatabase.store(tree);
      const commit = new (getCommit())(nextCommitIdFn(), {
        treeId: tree.id,
        parentIds: [engine.branchManager.headCommitId()],
        message: 'remote update',
      });
      remote.objectDatabase.store(commit);
      remote.branches.set('main', commit.id);
    },
  },

  // Level 17: git pull
  {
    title: 'Pull Remote Changes',
    world: 'World 3: Remote',
    description: 'Pull is fetch + merge in one step. It downloads remote changes and immediately integrates them into your branch.',
    objectives: [
      {
        text: 'Pull from origin to get the latest changes',
        check: (state) => {
          const trackingBranches = state.remoteModel.listTrackingBranches();
          if (trackingBranches.length === 0) return false;
          // Check that local main matches or is ahead of tracking
          const mainCommit = state.branchManager.getBranchCommit('main');
          const trackingCommit = state.remoteModel.getTrackingBranch('origin', 'main');
          return mainCommit === trackingCommit || state.mergeEngine.isAncestor(trackingCommit, mainCommit);
        },
      },
    ],
    hints: [
      'Run <code>git pull origin main</code> to fetch and merge in one step.',
      'This is equivalent to <code>git fetch origin</code> + <code>git merge origin/main</code>.',
    ],
    concepts: [
      '<code>git pull</code> = <code>git fetch</code> + <code>git merge</code>.',
      'It downloads new commits AND merges them into your current branch.',
      'If there are conflicts, you\'ll need to resolve them just like a regular merge.',
    ],
    setup: (engine) => {
      engine.initialized = true;
      engine.branchManager.init('main');
      engine.workingDirectory.writeFile('readme.txt', 'My Project');
      engine.execute('add', ['readme.txt']);
      engine.execute('commit', [], { '-m': 'initial commit' });
      engine.remoteModel.addRemote('origin', 'https://github.com/user/repo.git');
      // Push initial state
      const remote = engine.remoteModel.getRemote('origin');
      remote.receiveObjects(engine.objectDatabase, [engine.branchManager.headCommitId()]);
      remote.branches.set('main', engine.branchManager.headCommitId());
      engine.remoteModel.setTrackingBranch('origin', 'main', engine.branchManager.headCommitId());
    },
  },

  // Level 18: Full push/pull workflow
  {
    title: 'Push & Pull Workflow',
    world: 'World 3: Remote',
    description: 'Practice the complete workflow: make changes, commit, push to remote, and verify.',
    objectives: [
      {
        text: 'Make a new commit with a new file',
        check: (state) => state.commits.length >= 2,
      },
      {
        text: 'Push your changes to origin',
        check: (state) => {
          if (!state.remoteModel.hasRemote('origin')) return false;
          const remote = state.remoteModel.getRemote('origin');
          const localHead = state.branchManager.headCommitId();
          return remote.branches.get('main') === localHead;
        },
      },
    ],
    hints: [
      'Create and commit: <code>echo "new feature" > feature.js</code> → <code>git add feature.js</code> → <code>git commit -m "add feature"</code>',
      'Push: <code>git push origin main</code>',
    ],
    concepts: [
      'The typical workflow: <strong>edit → stage → commit → push</strong>.',
      'Always commit before pushing. You push commits, not individual file changes.',
      'If someone else pushed first, you may need to <code>git pull</code> before you can push.',
    ],
    setup: (engine) => {
      engine.initialized = true;
      engine.branchManager.init('main');
      engine.workingDirectory.writeFile('readme.txt', 'Collaborative Project');
      engine.execute('add', ['readme.txt']);
      engine.execute('commit', [], { '-m': 'initial commit' });
      engine.remoteModel.addRemote('origin', 'https://github.com/team/project.git');
      const remote = engine.remoteModel.getRemote('origin');
      remote.receiveObjects(engine.objectDatabase, [engine.branchManager.headCommitId()]);
      remote.branches.set('main', engine.branchManager.headCommitId());
      engine.remoteModel.setTrackingBranch('origin', 'main', engine.branchManager.headCommitId());
    },
  },

  // ══════════════════════════════════════
  // WORLD 4: ADVANCED (Levels 19-22)
  // ══════════════════════════════════════

  // Level 19: git stash
  {
    title: 'Stash Your Changes',
    world: 'World 4: Advanced',
    description: 'Sometimes you need to switch context but aren\'t ready to commit. Stash saves your changes temporarily.',
    objectives: [
      {
        text: 'Create some uncommitted changes',
        check: (state) => {
          if (state.commits.length === 0) return false;
          const committed = state.mergeEngine.getFilesAtCommit(state.headCommitId);
          for (const path of state.workingDirectory.listFiles()) {
            if (!committed.has(path)) return true;
            if (state.workingDirectory.readFile(path) !== committed.get(path)) return true;
          }
          return state.stash.length > 0; // Already stashed counts too
        },
      },
      {
        text: 'Stash the changes with git stash',
        check: (state) => state.stash.length >= 1,
      },
      {
        text: 'Restore them with git stash pop',
        check: (state) => {
          // Stash was used and is now empty (popped)
          return state.stash.length === 0 &&
            state.workingDirectory.listFiles().length > 1;
        },
      },
    ],
    hints: [
      'Create changes: <code>echo "wip" > temp.txt</code>',
      'Stash them: <code>git stash</code>',
      'Check with <code>ls</code> — your changes are gone! Then <code>git stash pop</code> to bring them back.',
    ],
    concepts: [
      '<code>git stash</code> saves uncommitted changes and reverts to a clean state.',
      '<code>git stash pop</code> restores the most recently stashed changes.',
      '<code>git stash list</code> shows all saved stashes.',
      'Stash is like a clipboard for your changes — useful when switching branches mid-work.',
    ],
    setup: (engine) => {
      engine.initialized = true;
      engine.branchManager.init('main');
      engine.workingDirectory.writeFile('readme.txt', 'My Project');
      engine.execute('add', ['readme.txt']);
      engine.execute('commit', [], { '-m': 'initial commit' });
    },
  },

  // Level 20: git reset
  {
    title: 'Reset & Undo',
    world: 'World 4: Advanced',
    description: 'Learn the three modes of git reset: --soft, --mixed, and --hard. Each undoes commits differently.',
    objectives: [
      {
        text: 'Create at least 3 commits',
        check: (state) => state.commits.length >= 3,
      },
      {
        text: 'Use git reset to go back to a previous commit',
        check: (state) => {
          // HEAD should point to an earlier commit than the max
          const maxId = Math.max(...state.commits.map(c => parseInt(c.id.slice(1))));
          const headNum = parseInt(state.headCommitId?.slice(1) || '0');
          return headNum < maxId;
        },
      },
    ],
    hints: [
      'Make 3 commits with different files.',
      'Try <code>git reset --soft HEAD~1</code> — undoes the commit but keeps changes staged.',
      'Try <code>git reset --mixed HEAD~1</code> — undoes commit and unstages changes.',
      'Try <code>git reset --hard HEAD~1</code> — undoes everything, like it never happened!',
    ],
    concepts: [
      '<code>--soft</code>: moves HEAD back, keeps staging area and working directory unchanged.',
      '<code>--mixed</code> (default): moves HEAD back, resets staging area, keeps working directory.',
      '<code>--hard</code>: moves HEAD back, resets staging area AND working directory. <strong>Destructive!</strong>',
      'Think of it as three levels of "undo" — soft is gentlest, hard is most aggressive.',
    ],
    setup: (engine) => {
      engine.initialized = true;
      engine.branchManager.init('main');
    },
  },

  // Level 21: git rebase
  {
    title: 'Rebase a Branch',
    world: 'World 4: Advanced',
    description: 'Rebasing replays your branch\'s commits on top of another branch, creating a clean linear history.',
    objectives: [
      {
        text: 'Switch to the feature branch',
        check: (state) => state.currentBranch === 'feature',
      },
      {
        text: 'Rebase feature onto main',
        check: (state) => {
          if (state.currentBranch !== 'feature') return false;
          const featureCommit = state.branchManager.getBranchCommit('feature');
          const mainCommit = state.branchManager.getBranchCommit('main');
          // After rebase, main should be an ancestor in a linear chain
          return state.mergeEngine.isAncestor(mainCommit, featureCommit);
        },
      },
    ],
    hints: [
      'Switch to feature: <code>git checkout feature</code>',
      'Rebase onto main: <code>git rebase main</code>',
      'Watch the graph — your commits are replayed on top of main, creating a linear history!',
    ],
    concepts: [
      '<code>git rebase &lt;branch&gt;</code> takes your commits and replays them on top of that branch.',
      'Rebase creates <strong>new commits</strong> with new IDs (the old ones still exist but are unreachable).',
      '<strong>Merge vs Rebase</strong>: Merge preserves history as-is. Rebase rewrites for a cleaner, linear history.',
      'Golden rule: <strong>never rebase commits that others have based work on</strong>.',
    ],
    setup: (engine) => {
      engine.initialized = true;
      engine.branchManager.init('main');
      engine.workingDirectory.writeFile('readme.txt', 'My Project');
      engine.execute('add', ['readme.txt']);
      engine.execute('commit', [], { '-m': 'initial commit' });
      // Create feature branch
      engine.execute('checkout', ['feature'], { '-b': true });
      engine.workingDirectory.writeFile('feature.txt', 'feature work');
      engine.execute('add', ['feature.txt']);
      engine.execute('commit', [], { '-m': 'feature work' });
      // Add commit on main too (to make rebase meaningful)
      engine.execute('checkout', ['main'], {});
      engine.workingDirectory.writeFile('hotfix.txt', 'hotfix');
      engine.execute('add', ['hotfix.txt']);
      engine.execute('commit', [], { '-m': 'hotfix on main' });
    },
  },

  // Level 22: Sandbox
  {
    title: 'Free Sandbox',
    world: 'World 4: Advanced',
    description: 'Congratulations on reaching the final level! This is a free sandbox where you can experiment with any Git commands. There are no objectives — just play and explore!',
    objectives: [
      {
        text: 'Make any 3 commits to complete the course!',
        check: (state) => state.commits.length >= 3,
      },
    ],
    hints: [
      'Try creating multiple branches and merging them.',
      'Experiment with rebase vs merge to see the difference.',
      'Try stashing, resetting, and other advanced commands.',
      'There\'s no wrong answer here — have fun!',
    ],
    concepts: [
      'You\'ve learned: <code>init, add, commit, status, log, diff, branch, checkout, switch, merge, remote, clone, push, fetch, pull, stash, reset, rebase</code>.',
      'Keep practicing! Git gets easier with repetition.',
      'Pro tip: in real Git, use <code>git reflog</code> to recover from almost any mistake.',
    ],
    setup: (engine) => {
      engine.initialized = true;
      engine.branchManager.init('main');
    },
  },
];

// ── Helper functions for level setup that needs imports ──
// (Used by levels that need to create objects directly on remotes)
// We use a simplified approach: levels 16-17 set up remotes differently

// Fix level 16 and 17 setup to not use imports
// Override them to use engine methods instead
import { Blob, Tree, Commit, nextCommitId, nextBlobId, nextTreeId } from '../engine/git-object-model.js';

levels[15].setup = (engine) => {
  engine.initialized = true;
  engine.branchManager.init('main');
  engine.workingDirectory.writeFile('readme.txt', 'My Project');
  engine.execute('add', ['readme.txt']);
  engine.execute('commit', [], { '-m': 'initial commit' });
  engine.remoteModel.addRemote('origin', 'https://github.com/user/repo.git');

  const remote = engine.remoteModel.getRemote('origin');
  remote.receiveObjects(engine.objectDatabase, [engine.branchManager.headCommitId()]);

  // Create a remote-only commit
  const blob = new Blob(nextBlobId(), 'remote change');
  remote.objectDatabase.store(blob);
  // We need to also include existing blobs
  const existingTree = engine.objectDatabase.get(engine.objectDatabase.get(engine.branchManager.headCommitId()).treeId);
  const newEntries = new Map(existingTree.entries);
  newEntries.set('remote-file.txt', blob.id);
  const tree = new Tree(nextTreeId(), newEntries);
  remote.objectDatabase.store(tree);
  const commit = new Commit(nextCommitId(), {
    treeId: tree.id,
    parentIds: [engine.branchManager.headCommitId()],
    message: 'remote update',
  });
  remote.objectDatabase.store(commit);
  remote.branches.set('main', commit.id);
};

levels[16].setup = (engine) => {
  engine.initialized = true;
  engine.branchManager.init('main');
  engine.workingDirectory.writeFile('readme.txt', 'My Project');
  engine.execute('add', ['readme.txt']);
  engine.execute('commit', [], { '-m': 'initial commit' });
  engine.remoteModel.addRemote('origin', 'https://github.com/user/repo.git');

  const remote = engine.remoteModel.getRemote('origin');
  remote.receiveObjects(engine.objectDatabase, [engine.branchManager.headCommitId()]);

  // Create remote-only commits
  const blob = new Blob(nextBlobId(), 'new feature from teammate');
  remote.objectDatabase.store(blob);
  const existingTree = engine.objectDatabase.get(engine.objectDatabase.get(engine.branchManager.headCommitId()).treeId);
  const newEntries = new Map(existingTree.entries);
  newEntries.set('teammate.js', blob.id);
  const tree = new Tree(nextTreeId(), newEntries);
  remote.objectDatabase.store(tree);
  const commit = new Commit(nextCommitId(), {
    treeId: tree.id,
    parentIds: [engine.branchManager.headCommitId()],
    message: 'teammate added feature',
  });
  remote.objectDatabase.store(commit);
  remote.branches.set('main', commit.id);
  engine.remoteModel.setTrackingBranch('origin', 'main', engine.branchManager.headCommitId());
};
