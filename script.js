document.addEventListener('DOMContentLoaded', function() {
  // DOM Elements
  const exprInput = document.getElementById('expr');
  const assignInput = document.getElementById('assign');
  const evaluateBtn = document.getElementById('evaluateBtn');
  const generateAllBtn = document.getElementById('generateAllBtn');
  const copyTableBtn = document.getElementById('copyTableBtn');
  const stepsOutput = document.getElementById('steps');
  const truthTableOutput = document.getElementById('truthTable');

  // Initialize
  evaluateBtn.addEventListener('click', evaluate);
  generateAllBtn.addEventListener('click', generateAllAssignments);
  copyTableBtn.addEventListener('click', copyTruthTable);
  evaluate(); // Evaluate default example

  function evaluate() {
    try {
      const expr = exprInput.value.trim();
      const assignStr = assignInput.value.trim();
      
      if (!expr) {
        throw new Error("Please enter a proposition");
      }
      
      const assignments = parseAssignments(assignStr);
      const variables = extractVariables(expr);
      
      if (!variables.length) {
        throw new Error("No variables found in the proposition");
      }
      
      // Generate step-by-step solution
      const steps = generateStepByStep(expr, assignments, variables);
      stepsOutput.textContent = steps.join("\n");

      // Generate truth table
      const { headers, rows } = generateTruthTable(expr, variables);
      
      let html = `<table><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;
      rows.forEach(row => {
        html += `<tr>${headers.map(h => `<td>${row[h]}</td>`).join('')}</tr>`;
      });
      html += "</table>";
      
      truthTableOutput.innerHTML = html;
      
    } catch (error) {
      stepsOutput.textContent = `Error: ${error.message}`;
      truthTableOutput.innerHTML = '';
    }
  }

  function parseAssignments(assignStr) {
    const assignments = {};
    const pairs = assignStr.split(/,|;/).map(s => s.trim()).filter(s => s);
    
    for (const pair of pairs) {
      const [v, val] = pair.split('=').map(s => s.trim());
      if (v && (val === '0' || val === '1')) {
        assignments[v] = parseInt(val);
      }
    }
    
    return assignments;
  }

  function extractVariables(expr) {
    const vars = expr.match(/[A-Za-z]+/g) || [];
    return [...new Set(vars)].sort((a, b) => a.localeCompare(b));
  }

  function generateAllAssignments() {
    const expr = exprInput.value.trim();
    const variables = extractVariables(expr);
    
    if (!variables.length) {
      stepsOutput.textContent = "Error: No variables found in the proposition";
      truthTableOutput.innerHTML = '';
      return;
    }
    
    // Generate assignments string with all combinations of 0 and 1
    const assignments = [];
    const count = variables.length;
    
    for (let i = 0; i < Math.pow(2, count); i++) {
      const assignment = variables.map((v, idx) => 
        `${v}=${(i >> (count - 1 - idx)) & 1}`
      ).join(',');
      assignments.push(assignment);
    }
    
    assignInput.value = assignments.join('; ');
    evaluate();
  }

  function generateStepByStep(expr, assignments, variables) {
    const steps = [];
    let currentExpr = expr;
    
    // Step 1: Show original expression with substituted values
    if (Object.keys(assignments).length > 0) {
        let substituted = expr;
        for (const v in assignments) {
            substituted = substituted.replace(new RegExp(v, 'g'), assignments[v]);
        }
        steps.push(`Step 1: ${substituted}`);
        currentExpr = substituted;
    } else {
        steps.push(`Step 1: ${expr}`);
    }
    
    // Process parentheses first (left to right)
    while (currentExpr.includes('(')) {
        const leftParen = currentExpr.indexOf('(');
        let rightParen = -1;
        let parenDepth = 0;
        
        // Find matching right parenthesis
        for (let i = leftParen; i < currentExpr.length; i++) {
            if (currentExpr[i] === '(') parenDepth++;
            if (currentExpr[i] === ')') parenDepth--;
            if (parenDepth === 0) {
                rightParen = i;
                break;
            }
        }
        
        if (rightParen === -1) break;
        
        const subExpr = currentExpr.slice(leftParen + 1, rightParen);
        const simplified = simplifyExpression(subExpr, false);
        
        if (simplified !== subExpr) {
            currentExpr = currentExpr.slice(0, leftParen) + simplified + currentExpr.slice(rightParen + 1);
            steps.push(`Step ${steps.length + 1}: ${currentExpr}`);
        } else {
            break;
        }
    }
    
    // Then simplify the remaining expression
    const simplified = simplifyExpression(currentExpr, true);
    if (simplified !== currentExpr) {
        steps.push(`Step ${steps.length + 1}: ${simplified}`);
        currentExpr = simplified;
    }
    
    // Final result
    steps.push(`Step ${steps.length + 1}: Z = ${currentExpr.replace(/[()]/g, '')}`);
    
    return steps;
  }

  function simplifyExpression(expr, showSteps) {
    let current = expr;
    let changed;
    
    do {
        changed = false;
        let next = current;
        
        // Handle NOT operations first
        next = next.replace(/¬1/g, '0');
        next = next.replace(/¬0/g, '1');
        if (next !== current) {
            if (showSteps) return next;
            current = next;
            changed = true;
            continue;
        }
        
        // Handle implicit multiplication (A¬B becomes A·¬B)
        next = next.replace(/([01])(¬[01])/g, '$1·$2');
        next = next.replace(/([01])([01])/g, '$1·$2');
        if (next !== current) {
            if (showSteps) return next;
            current = next;
            changed = true;
            continue;
        }
        
        // Handle AND operations
        next = next.replace(/1∧1|1·1/g, '1');
        next = next.replace(/1∧0|1·0|0∧1|0·1|0∧0|0·0/g, '0');
        if (next !== current) {
            if (showSteps) return next;
            current = next;
            changed = true;
            continue;
        }
        
        // Handle XOR operations
        next = next.replace(/1⊕1|0⊕0/g, '0');
        next = next.replace(/1⊕0|0⊕1/g, '1');
        if (next !== current) {
            if (showSteps) return next;
            current = next;
            changed = true;
            continue;
        }
        
        // Handle OR operations
        next = next.replace(/1∨0|0∨1|1∨1|1\+0|0\+1|1\+1/g, '1');
        next = next.replace(/0∨0|0\+0/g, '0');
        if (next !== current) {
            if (showSteps) return next;
            current = next;
            changed = true;
            continue;
        }
        
        // Handle implication
        next = next.replace(/([01])→([01])/g, (m, a, b) => a === '1' && b === '0' ? '0' : '1');
        if (next !== current) {
            if (showSteps) return next;
            current = next;
            changed = true;
            continue;
        }
        
        // Handle biconditional
        next = next.replace(/1↔1|0↔0/g, '1');
        next = next.replace(/1↔0|0↔1/g, '0');
        if (next !== current) {
            if (showSteps) return next;
            current = next;
            changed = true;
            continue;
        }
        
    } while (changed);
    
    return current;
  }

  function generateTruthTable(expr, variables) {
    const subExpressions = identifySubExpressions(expr);
    const headers = [...variables, ...subExpressions, 'Z'];
    const rows = [];
    const varCount = variables.length;
    
    for (let mask = 0; mask < (1 << varCount); mask++) {
      const row = {};
      variables.forEach((v, i) => row[v] = (mask >> (varCount - 1 - i)) & 1);
      
      // Evaluate sub-expressions
      for (const subExpr of subExpressions) {
        let evalExpr = subExpr;
        for (const v of variables) {
          evalExpr = evalExpr.replace(new RegExp(v, 'g'), row[v]);
        }
        
        // Evaluate the sub-expression properly
        try {
          const steps = generateStepByStep(subExpr, row, variables);
          const finalStep = steps[steps.length - 1];
          const result = finalStep.match(/Z = ([01])/)[1];
          row[subExpr] = result;
        } catch {
          row[subExpr] = '0'; // Default to 0 if evaluation fails
        }
      }
      
      // Evaluate full expression
      try {
        const steps = generateStepByStep(expr, row, variables);
        const finalStep = steps[steps.length - 1];
        const result = finalStep.match(/Z = ([01])/)[1];
        row['Z'] = result;
      } catch {
        row['Z'] = '0'; // Default to 0 if evaluation fails
      }
      
      rows.push(row);
    }
    
    return { headers, rows };
  }

  function identifySubExpressions(expr) {
    const subExprs = new Set();
    
    // Extract parenthetical expressions
    const parenMatches = expr.match(/\([^()]+\)/g) || [];
    parenMatches.forEach(match => subExprs.add(match));
    
    // Extract binary operations
    const binaryOps = ['⊕', '∧', '∨', '→', '↔', '·', '+'];
    binaryOps.forEach(op => {
      const pattern = new RegExp(`[^()]+\\${op}[^()]+`);
      const matches = expr.match(pattern) || [];
      matches.forEach(match => subExprs.add(match));
    });
    
    // Extract NOT operations
    const notMatches = expr.match(/¬[^()∧∨⊕→↔·+]+/g) || [];
    notMatches.forEach(match => subExprs.add(match));
    
    return Array.from(subExprs).sort((a, b) => b.length - a.length);
  }

  function copyTruthTable() {
    if (!truthTableOutput.innerHTML) {
      alert('No truth table to copy');
      return;
    }
    
    const table = truthTableOutput.querySelector('table');
    let text = '';
    
    // Get headers
    const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent);
    text += headers.join('\t') + '\n';
    
    // Get rows
    const rows = table.querySelectorAll('tr:not(:first-child)');
    rows.forEach(row => {
      const cells = Array.from(row.querySelectorAll('td')).map(td => td.textContent);
      text += cells.join('\t') + '\n';
    });
    
    navigator.clipboard.writeText(text).then(() => {
      const originalText = copyTableBtn.textContent;
      copyTableBtn.textContent = 'Copied!';
      setTimeout(() => {
        copyTableBtn.textContent = originalText;
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy:', err);
      alert('Failed to copy truth table');
    });
  }
});
