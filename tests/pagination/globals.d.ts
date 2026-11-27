declare global {
  interface PaginationCandidate {
    token: { node: Node; offset: number }
    apply: () => void
  }

  interface PaginationRule {
    compute: (
      breakToken: { node: Node; offset: number },
      overflow: Range | null,
      rendered: Element,
    ) => PaginationCandidate | undefined
  }

  interface Window {
    PAGED_READY?: boolean
    __TEST_MEASURED__: unknown
    PaginationRules: {
      KeepHeadingWithParagraph: PaginationRule
      MinWidowLines: PaginationRule
      MinOrphanLines: PaginationRule
      BreakTokenDispatch: new () => {
        onBreakToken: (
          breakToken: { node: Node; offset: number },
          overflow: Range | null,
          rendered: Element,
        ) => { node: Node; offset: number } | undefined
      }
    }
  }
}

export {}
