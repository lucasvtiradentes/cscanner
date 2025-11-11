use crate::types::{Issue, Severity};
use crate::rules::{Rule, RuleRegistration, RuleMetadata, RuleMetadataRegistration, RuleCategory};
use crate::config::RuleType;
use swc_common::Spanned;
use swc_ecma_ast::*;
use swc_ecma_visit::{Visit, VisitWith};
use std::path::Path;
use std::sync::Arc;

pub struct NoImplicitAnyRule;

inventory::submit!(RuleRegistration {
    name: "no-implicit-any",
    factory: || Arc::new(NoImplicitAnyRule),
});

inventory::submit!(RuleMetadataRegistration {
    metadata: RuleMetadata {
        name: "no-implicit-any",
        display_name: "No Implicit Any",
        description: "Detects function parameters without type annotations that implicitly have 'any' type.",
        rule_type: RuleType::Ast,
        default_severity: Severity::Error,
        default_enabled: false,
        category: RuleCategory::TypeSafety,
    }
});

impl Rule for NoImplicitAnyRule {
    fn name(&self) -> &str {
        "no-implicit-any"
    }

    fn check(&self, program: &Program, path: &Path, source: &str) -> Vec<Issue> {
        let mut visitor = ImplicitAnyVisitor {
            issues: Vec::new(),
            path: path.to_path_buf(),
            source,
        };
        program.visit_with(&mut visitor);
        visitor.issues
    }
}

struct ImplicitAnyVisitor<'a> {
    issues: Vec<Issue>,
    path: std::path::PathBuf,
    source: &'a str,
}

impl<'a> ImplicitAnyVisitor<'a> {
    fn check_param(&mut self, param: &Param) {
        match &param.pat {
            Pat::Ident(ident) => {
                if ident.type_ann.is_none() {
                    let span = ident.span();
                    let (line, column) = self.get_line_col(span.lo.0 as usize);

                    self.issues.push(Issue {
                        rule: "no-implicit-any".to_string(),
                        file: self.path.clone(),
                        line,
                        column,
                        message: format!(
                            "Parameter '{}' implicitly has 'any' type. Add type annotation.",
                            ident.id.sym
                        ),
                        severity: Severity::Error,
                    });
                }
            }
            Pat::Array(arr) => {
                if arr.type_ann.is_none() {
                    let span = arr.span();
                    let (line, column) = self.get_line_col(span.lo.0 as usize);

                    self.issues.push(Issue {
                        rule: "no-implicit-any".to_string(),
                        file: self.path.clone(),
                        line,
                        column,
                        message: "Destructured parameter implicitly has 'any' type. Add type annotation.".to_string(),
                        severity: Severity::Error,
                    });
                }
            }
            Pat::Object(obj) => {
                if obj.type_ann.is_none() {
                    let span = obj.span();
                    let (line, column) = self.get_line_col(span.lo.0 as usize);

                    self.issues.push(Issue {
                        rule: "no-implicit-any".to_string(),
                        file: self.path.clone(),
                        line,
                        column,
                        message: "Destructured parameter implicitly has 'any' type. Add type annotation.".to_string(),
                        severity: Severity::Error,
                    });
                }
            }
            Pat::Rest(rest) => {
                if rest.type_ann.is_none() {
                    let span = rest.span();
                    let (line, column) = self.get_line_col(span.lo.0 as usize);

                    self.issues.push(Issue {
                        rule: "no-implicit-any".to_string(),
                        file: self.path.clone(),
                        line,
                        column,
                        message: "Rest parameter implicitly has 'any' type. Add type annotation.".to_string(),
                        severity: Severity::Error,
                    });
                }
            }
            _ => {}
        }
    }

    fn get_line_col(&self, byte_pos: usize) -> (usize, usize) {
        let mut line = 1;
        let mut col = 1;

        for (i, ch) in self.source.char_indices() {
            if i >= byte_pos {
                break;
            }
            if ch == '\n' {
                line += 1;
                col = 1;
            } else {
                col += 1;
            }
        }

        (line, col)
    }
}

impl<'a> Visit for ImplicitAnyVisitor<'a> {
    fn visit_function(&mut self, n: &Function) {
        for param in &n.params {
            self.check_param(param);
        }
        n.visit_children_with(self);
    }

    fn visit_arrow_expr(&mut self, n: &ArrowExpr) {
        for pat in &n.params {
            match pat {
                Pat::Ident(ident) => {
                    if ident.type_ann.is_none() {
                        let span = ident.span();
                        let (line, column) = self.get_line_col(span.lo.0 as usize);

                        self.issues.push(Issue {
                            rule: "no-implicit-any".to_string(),
                            file: self.path.clone(),
                            line,
                            column,
                            message: format!(
                                "Parameter '{}' implicitly has 'any' type. Add type annotation.",
                                ident.id.sym
                            ),
                            severity: Severity::Error,
                        });
                    }
                }
                Pat::Array(arr) => {
                    if arr.type_ann.is_none() {
                        let span = arr.span();
                        let (line, column) = self.get_line_col(span.lo.0 as usize);

                        self.issues.push(Issue {
                            rule: "no-implicit-any".to_string(),
                            file: self.path.clone(),
                            line,
                            column,
                            message: "Destructured parameter implicitly has 'any' type. Add type annotation.".to_string(),
                            severity: Severity::Error,
                        });
                    }
                }
                Pat::Object(obj) => {
                    if obj.type_ann.is_none() {
                        let span = obj.span();
                        let (line, column) = self.get_line_col(span.lo.0 as usize);

                        self.issues.push(Issue {
                            rule: "no-implicit-any".to_string(),
                            file: self.path.clone(),
                            line,
                            column,
                            message: "Destructured parameter implicitly has 'any' type. Add type annotation.".to_string(),
                            severity: Severity::Error,
                        });
                    }
                }
                Pat::Rest(rest) => {
                    if rest.type_ann.is_none() {
                        let span = rest.span();
                        let (line, column) = self.get_line_col(span.lo.0 as usize);

                        self.issues.push(Issue {
                            rule: "no-implicit-any".to_string(),
                            file: self.path.clone(),
                            line,
                            column,
                            message: "Rest parameter implicitly has 'any' type. Add type annotation.".to_string(),
                            severity: Severity::Error,
                        });
                    }
                }
                _ => {}
            }
        }
        n.visit_children_with(self);
    }
}
