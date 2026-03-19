// ══════════════ BIRDS ANIMATED THEME ══════════════
(function() {
  // ── Bird SVG data URIs (from flock SVG) ──
  const _BIRD_URIS = [
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjEzNDQgMjMgMzAwIDEzMCI+PHBhdGggZD0ibTE0OTMuOCA1Mi45YzEuMiAwLjkgMi4yIDIuMSAyLjMgMy42IDAuOS0wLjEgMS44IDAgMi43LTAuMyAxLTAuOCAxLjItMi44IDIuOC0yLjcgMS40IDEuOC0wLjggNy4yLTIgOC41LTEuNiAxLjctMC4xIDQuMS0xLjQgNS45IDAuMyAwLjEgMC44IDAuNCAxIDAuNSAwLjQtMC4yIDAuOC0wLjMgMS4yLTAuNC0wLjEgMC4zLTAuMyAxLTAuNCAxLjMgMS43LTAuMyAzLjItMSA1LTEgMC41IDItMC4yIDMuOS0xLjMgNS40IDAuMyAwLjQgMC43IDAuOCAxIDEuMS0wLjUgNC4zLTIuNCAzLjgtMC44IDYuNS0wLjUgMi4yLTIuMiA0LTIuMiA2LjMgMCAyLjgtMi43IDQuNy0yLjggNy41LTAuMSAxLjYtMi4xIDIuMi0yLjIgMy44LTAuMiAyLTEuNCAzLjktMy40IDQuNi0wLjMgMS41LTAuNiAzLTEuOSAzLjktMC4xIDAuOS0wLjEgMS43LTAuMiAyLjYtMC41IDAuNC0wLjkgMC45LTEuMyAxLjMtMC4xIDAuOS0wLjMgMS45LTAuNCAyLjgtMC41IDAuMy0xLjEgMC43LTEuNiAxLjEtMC4xIDEuMS0wLjIgMi41LTEuMyAzLTEuNyAwLjktMS41IDMuNC0zLjQgMy45LTEgMi40LTIuNyA0LjgtNS4xIDUuOCAwIDAuNiAwIDEuMyAwLjEgMS45IDAuOCAwLjEgMS43LTAuMSAyLjUtMC40LTAuNCAwLjQtMC44IDAuNy0xLjIgMS4xIDEuNyAwLjIgMy4yIDAuOCA0LjggMS4yIDAtMC4zLTAuMS0wLjgtMC4xLTEgMS4xIDAuMSAyLjIgMC4xIDMuMyAwLTAuNSAwLjItMS4xIDAuNS0xLjYgMC43IDEuMyAwLjIgMi41IDAuNSAzLjggMC44IDAgMC40IDAgMC44IDAuMSAxLjIgMy41IDAuNCA2IDMuNSA5LjYgMy4zLTAuMyAwLjEtMC45IDAuMy0xLjEgMC40IDIuOCAzLjcgMC44IDAuNiAxLjggNi43LTAuOCAwLjUtMS41IDEuMi0xLjMgMi4yIDAuMiAzLjMtMi4zIDUuOS0zIDkuMS0wLjUgMS42LTUuMiAzLjctNi4yIDMuNy0xLjUgMC4xLTIuMyAxLjctMy41IDIuNC0wLjkgMC4zLTEuOCAwLjUtMi43IDAuOC0xIDAuNy0yLjYgMy02IDIuNi0yLjktMi40LTMuNS02LjQtNC42LTkuOC0wLjctMy0yLjYtNS41LTMuNS04LjQtMC43LTEuNS0wLjctMy42LTIuNS00LjMtMC45IDEuNC0yLjEgMi43LTIuNyA0LjItMC43IDAuMS0xLjMgMC4yLTEuOSAwLjMtMi43IDUuMy00LjUgMi43LTYgNS42LTUuMSAwLjYtMi41IDAuMy02LjQgMy43LTE0LjUgNi45LTE3LjUgNi45LTIyLjYgNy4yLTAuNC0wLjUtMC44LTAuOS0xLjItMS40IDEuMi0xLjIgMS45LTMuMiAwLjQtNC40LTYuNC0yLjQtNSAyLTEyLjEgMy45LTAuMi0wLjMtMC41LTAuOS0wLjYtMS4xIDAuOS0yIDMuMi0zLjEgMy41LTUuNC00LjkgMC43LTYuOSAyLjYtNy45IDAuOSAwLjgtMi4yIDUuNy0zLjcgOC42LTggMS41LTEuMSAyLjUtMi44IDQuMi0zLjcgMS41LTIuMiAzLjgtMy44IDUuMi02LjEgMi43LTUuOCA2LjEtOC44IDkuNC0xMS43IDEuMS0wLjQgMi4zLTAuNSAzLjQtMS4xIDAuOC0wLjQgMC42LTEuNCAwLjgtMi4xIDAuMyAwLjIgMC41IDAuNSAwLjggMC43IDAuNy0xLjEgMS45LTIuMyAxLjUtMy43LTAuOS0yLjItMi40LTQuMy0yLjMtNi44IDAuMS0zLjktNy4yLTkuNi04LjItMTEuMSAxLjggMC4xIDMuNiAwLjIgNS4yLTAuNyAyLjItMC4xIDUtMC41IDYuNyAxLjMgMS4xIDEuMSAyLjUgMiA0IDEuMiAwLjEgMC4xIDAuMiAwLjMgMC4zIDAuNC0wLjIgMC4yLTAuNSAwLjUtMC43IDAuNiAxLjQgMC41IDIuOCAxIDQgMS45IDEgMCAyIDAgMy4xIDAuMiAyLjUtNC4yIDAuMSAyLjIgNi45LTEyIDAuOS0xLjggMS40LTQgMi45LTUuNSAwLjgtMC45IDEuNi0xLjcgMi4xLTIuOCAxLjctMSAyLjQtMyA0LjEtNCAwLTAuNSAwLjEtMSAwLjEtMS41IDAuNCAwLjEgMC44IDAuMSAxLjIgMC4yIDEuNC0yLjkgMTguOC0xOC4yIDIxLjItMjguNHoiIGZpbGw9ImN1cnJlbnRDb2xvciIvPjwvc3ZnPg==',
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjgxOSA0NCAyNTAgMTEwIj48cGF0aCBkPSJtOTY5LjQgNzRjMi4zLTAuNiAxLjgtMy43IDQuMS00LjQgMCAyIDAgNC0wLjYgNS45LTAuNSAwLjcgMC43IDEuMyAxLjMgMC45IDEuOC0xLjUgMy4zLTMuNSA1LjItNC45IDAgMS4yIDAuMiAyLjUtMC41IDMuNi0wLjggMS4xLTAuNiAyLjctMS41IDMuOCAwLjgtMC4xIDEuNi0wLjMgMi40LTAuNCAxLjEgMi4xIDAuMyA0LjQgMCA2LjYgMy4xLTAuNCAxLjEgNC4yLTAuNCA2LjhsMS41IDAuOWMtMC41IDIuMi0wLjUgNC42LTIgNi40IDAuNCAwLjMgMC43IDAuNyAxLjEgMSAwLjEgMi4zLTEuMSA0LjMtMi4xIDYuMyAyLjIgMi4yIDAuMSA1LjYtMS45IDcuMSAwIDAuOSAwLjIgMS44IDAuMSAyLjYtMC41IDEuMy0xLjYgMi4yLTIuNSAzLjMtMC4zIDEgMC41IDIuMi0wLjEgMy4yLTEgMS43LTIuNiAyLjktNC42IDMuMi0wLjIgMS40IDAuNyAyLjcgMC42IDQuMS0wLjcgMS4yLTEuNiAyLjMtMi4yIDMuNS0wLjYtMC4xLTEuMi0wLjMtMS44LTAuNC0wLjggMS4xLTAuMiAyLjQgMC42IDMuNC0yLjEgMS4yLTIgNC4xLTQuMyA1LTAuNSAyLjYgMC42IDIuMy0yLjcgMy43LTAuMSAxLjYtMS4zIDIuNy0yLjkgMi45LTAuNSAxLjMtMS42IDIuMy0zIDIuMy0xLjYgMi4zLTIuNCAxLjctNC43IDEuMyAwLjQgMS42IDEuOSAzIDMuNyAyLjYtMC43IDAuNyAwLjUgMS4yIDEgMS42IDMuNCAwLjQgNS44IDMuNCA5LjEgNC4yIDEuNiAwLjIgMi41IDEuNyA0IDIuMSAyLjMgMC42IDQuMSAyLjQgNS45IDMuNyAxLjYgMS4yIDEuNSAzLjUgMS4zIDUuNC0yLjcgNi40LTEuNCAxMi44LTE5LjIgMTguMi00LjYgMS41LTUuOS03LjctOS40LTEzLjktMS4yLTIuNy0zLjQtNC44LTQuOS03LjQtMC43LTAuOC0xLjUtMi42LTIuOC0xLjgtMS4yIDEuMS0xLjcgMi42LTIuNSAzLjktMC45IDAuNi0xLjggMS4yLTIuMSAyLjMtMS40IDAuNC0yLjcgMS4yLTQuMSAxLjMtMC4xIDAuNi0wLjEgMS4zLTAuMiAyLTEtMC4yLTItMC42LTMtMS0wLjIgMC42LTAuNSAxLjEtMC43IDEuNy0yLTEuMS00LjUtMS4xLTYuNi0wLjQtMC44IDAuNS0xLjMgMS4yLTEuOSAxLjktNC43LTIuNC01LjggMC45LTcuNy0xLjItMC44IDAuNS0xLjYgMS4yLTIuNiAxLjEtMS4yIDAuMi0xLjctMS4xLTIuMi0xLjktMy40IDAuMy02LjctMC42LTEwLjEtMC4yLTEuMSAwLTEuOS0wLjktMi4zLTEuOS0xLjMgMC4yLTIuNCAwLjctMy42IDEtMC45LTAuMy0xLjctMC42LTIuNS0xIDAuMS0wLjYgMC4zLTEuMyAwLjUtMS45LTItMC4yLTMuOCAwLjQtNS44IDAuNS0xLjItMC42LTAuMy0xLjggMC40LTIuNC0wLjItMC4zLTAuNS0wLjgtMC42LTEuMS0xLjUgMC4yLTIuOSAxLjItNC40IDAuNiAwLjEtMiAyLjEtMyAzLjUtNC4ydi0xLjZjLTEuOCAwLjMtMy42IDAuNi01LjQgMC41IDAuNC0xLjcgMi4zLTIuNSAzLjYtMy41IDcuNC0zLjUgMTguOC0xMi41IDIzLTEzLjQgMS4zLTAuMyAyLjItMS4zIDMuMi0yLjIgMC43LTAuOCAxLjktMC41IDIuOS0wLjYgMiAwLjEgMy40LTEuNyA1LjQtMS42IDEuMyAwIDIuNy0wLjEgMy40LTEuMyAxLjMtMS4yIDEuMS0zLjEgMC43LTQuNy0wLjktMy4xLTAuNS02LjYtMi41LTkuMy0xLjgtMi4zLTIuNC01LjMtNC40LTcuNC0wLjMtMC40LTAuNi0wLjgtMC42LTEuMyAxLjEgMCAyLjMgMC4zIDMuNCAwLjQgNi45LTEuMSA0LjYtMC4xIDguNCAzLjQgMS4zIDEuMiAzLjMgMSA0LjggMi4xIDEuNiAxLjEgMy42IDEuMiA1LjUgMC44IDEtMC42IDEuNS0xLjggMi41LTIuNSA0LTIuOSA0LjgtOC42IDUuOS05LjggMS42LTEuOSAzLjUtMy43IDQuNC02IDEuNi0xIDcuNi03LjYgOC40LTguNi0wLjEtMC4yLTAuNC0wLjYtMC42LTAuOCAwLjctMC4yIDEuMy0wLjUgMi0wLjcgMC4xLTAuNiAwLjItMS4yIDAuMy0xLjcgMS43LTAuMSAzLjQtMS43IDIuOS0zLjUgMC43LTAuMyAxLjUtMC41IDIuMy0wLjh2LTEuNmMxLjItMC41IDAuNyAwLjQgNS00LjMtMC4yLTAuMi0wLjctMC41LTAuOS0wLjcgMi45LTAuMSA0LTMuMyA1LjUtNS40IDAuNC0xLjcgMi4zLTMuMyAxLjYtNS40eiIgZmlsbD0iY3VycmVudENvbG9yIi8+PC9zdmc+',
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjEyNDggMjQ2IDI4MCAxOTAiPjxwYXRoIGQ9Im0xMzQ4LjEgMjk2LjJjMi44LTAuNCA1LjYgMC4xIDguNC0wLjEgMS44LTAuMiAzLjQgMC44IDQuOSAxLjUgMC4yIDAuOCAwLjQgMS41IDAuNiAyLjMgMi41IDAuNyA0LjYgMi4xIDYuNSAzLjkgMi41IDEuMSA1LjIgMCA3LjggMC41IDMuNCAwLjYgNS43IDEgMTUuNSAxLjkgNC4xIDEuMSAxMC4yIDMuOSAxMi44IDMuOCA2LjcgNC42IDEyLjUgMy44IDExLjggOC42LTIuNSAyLjktNi41IDMuOC05LjYgNS43LTEuNSAxLTIuMiAzLTQuMSAzLjMtMS41IDAuNC0yLjggMS41LTMuOSAyLjUtMiA2LjQgMSA5LjQgMy45IDkuNCAyLjEgMC4zIDMuNC0xLjYgNS4zLTIuMiAwLTAuMi0wLjEtMC42LTAuMS0wLjggMC41LTAuMSAxLTAuMSAxLjUtMC4yIDAgMCAxMi43LTExLjQgMTMuOC0xMi42djEuOGMxLjIgMCAyLjMgMC4xIDMuNSAwLjIgMC41IDEuOS0wLjIgMy43LTAuMyA1LjYgMC42IDAuMSAxLjEgMC4yIDEuNyAwLjQgMC4zIDIuMyAwLjggNC41IDEuNSA2LjctMC40IDIuMS0wLjYgNC4zLTAuNSA2LjUgMC4xIDIuNS0xLjggNC43LTEuMSA3LjItMC45IDEuNC0xLjUgMi45LTEuNiA0LjYtMC4yIDIuMy0yLjMgNC0yLjQgNi4zLTAuMSAyLjEtMi40IDMuMy0yLjMgNS40LTAuMSA0LjYtMy44IDMtNC41IDYuNy0wLjIgMC4xLTAuNyAwLjQtMSAwLjUtMC40IDEuOC0wLjYgNC0yLjMgNS4xLTAuNS0wLjUtMS0wLjktMS40LTEuNC0wLjUgMS4zLTAuMyAzLTEuNyAzLjYtMS43IDAuNy0yLjYgMi41LTQuMiAzLjItMSAwLjMtMSAxLjQtMS4zIDIuMi0xLjYgMC4zLTMgMS40LTQuNSAyIDAuMSAxIDAuMyAyIDAuNiAyLjkgMC40IDAuMSAwLjkgMC4zIDEuMyAwLjQgMS4yIDEuOCAxMS42IDcuOSAxMi40IDguOSAwLjQtMC4xIDAuOC0wLjEgMS4yLTAuMiAwLjEgMC41IDAuMiAxLjEgMC40IDEuNiAxLjUgMC4zIDYuOSA0LjkgNC45IDctMS42IDIuMS0xLjUgNS4xLTMuNSA2LjktMS4yIDEuNi0zIDIuOS0yLjkgNXMtMi4zIDIuMi0zLjQgMy41Yy0wLjYtMC4xLTEuMS0wLjItMS43LTAuMy0wLjIgMC43LTAuMyAxLjQtMC40IDIuMi0xLjktMC4zLTMuNSAxLjItNS40IDEuMS0xLjMgMC4yLTIuNy0wLjQtNCAwLjMtMiAxLTQuMi0wLjItNi0xLjItMC4zIDAuNy0wLjUgMS40LTAuNyAyLjEtNS44IDAuMy00LjktNy44LTUuNy0xMi40LTAuNC01LjItMi4yLTEwLjItMi42LTE1LjQtMi4zLTAuMS0yLjUgMi45LTMuNSA0LjQtMS4xIDAuMi0yLjEgMC44LTIuOSAxLjUtMS42LTAuMy0zLjUgMC40LTMuNyAyLjMtMS40IDAuNi0yLjkgMC44LTQuNCAwLjktMC45IDAuNS0xIDEuNy0xLjcgMi4zLTEuNSAwLjctMy4xIDAuNS00LjcgMC42LTAuOSAwLjgtMS42IDEuOS0yLjcgMi40LTEtMC4zLTEuOC0wLjktMi44LTEuMSAwIDAuNC0wLjEgMS4xLTAuMiAxLjQtMC41LTAuMS0wLjktMC4yLTEuMy0wLjMtMC45IDEuNi0yIDMuMy0zLjYgNC4yLTEuOSAwLTQuMS0wLjItNS42IDEuMy0xLjcgMS42LTQuMyAwLjItNi4yIDEuMi0xLjEgMC41LTIuMiAxLjEtMy40IDEuNC0xLTAuMS0yLTAuNS0zLTAuNy0yLjIgMC00LjQgMS40LTYuNSAwLjYtMS42LTAuNy0zLjEgMC43LTQuOCAwLjctMS42IDAuMy0yLjktMC41LTQuNC0wLjktMS43IDAuNy0zLjUgMS4yLTUuNCAxLTEuMiAwLjItMS43LTEuMS0yLjItMi0yIDAuNC00LjEgMC43LTYuMiAwLjUgMC0xLjEgMC0yLjIgMC4xLTMuMy0xLjIgMS0yLjkgMC45LTQuNCAxLTAuNy0wLjMtMS42LTAuOC0xLjYtMS42IDEtMS42IDIuOC0yLjQgNC41LTMgMC0wLjQtMC4xLTEuMS0wLjEtMS41LTIuMiAwLjQtNC42IDAuOC02LjggMC42IDAuMy0wLjcgMC4zLTEuNiAwLjgtMi4xIDIuMi0xLjEgNC4zLTIuMSA2LjctMi43IDEuNy0xLjUgMy45LTIuMSA2LTIuOCAwLjItMC42IDAuNS0xLjEgMC44LTEuNyAyLjcgMCA0LjYtMi4yIDYuNi0zLjggMi4xLTIuMyA4LjktNC45IDkuNi03LjcgMC44LTIuOS0wLjEtNS45LTAuMS04LjggMC40LTU2LjQgMTMuNS01NyAyMy42LTYxLjggMC4xLTAuNSAwLjItMS4xIDAuMy0xLjYgMC41IDAuMyAxIDAuNiAxLjYgMC45IDAuMS0wLjYgMC4yLTEuMiAwLjQtMS44IDItMC40IDQtMS42IDUtMy40IDEtNi41LTYuMS0xNi44LTYuNi0xNy44LTAuNy0yLTIuOS0zLjQtNC40LTUuM20zNC40IDU1LjVjLTIuMSAxLjYtNC4yIDMuMS02IDUgNyA2LjkgNy44IDUgMTAuNCAyLjkgNS0zLjcgMC42LTEwLjUtMS45LTExLjMtMSAxLTEuMyAyLjYtMi41IDMuNG0tMTggMTAuNWMtMC42IDAuNy0xLjIgMS41LTEuNyAyLjMtMS40IDAuMi0yLjggMC41LTQuMiAwLjYgMC4xIDYuOC0yLjYgNS43LTQuNCA4LjgtMC45IDEuNy0yLjkgMi41LTMuNiA0LjMtMS42IDEuOS0zLjIgNC0zLjMgNi42IDIuOSAwLjcgMTUuOS05LjMgMTYuOS05LjggNC43LTIuMSAzLjUtOS43IDIuMy0xMy4xLTAuOCAwLjItMS40IDAuMy0yIDAuM3oiIGZpbGw9ImN1cnJlbnRDb2xvciIvPjwvc3ZnPg==',
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjE5NDcgMjc4IDM0MCAyMzAiPjxwYXRoIGQ9Im0yMDQ2LjggMzI4LjRjMC41LTAuNyAwLjgtMS43IDEuOC0xLjkgMC4xIDEuNS0wLjYgMi45LTEuMSA0LjIgMiAwLjUgMi44LTEuOCA0LjUtMi4yIDAuNyA0LjEtNC4yIDUuNy01IDkuMiAxIDAuMSAxLjktMC40IDIuNS0xLjMtMC4yIDAuNy0wLjQgMS40LTAuNSAyLjEgMS4xLTAuNiAyLjEtMS4zIDMuMS0yLjEgMS40IDIuOS0xLjcgNS4yLTIuNCA3LjktMC41IDEuOS0xLjggMy41LTIuOCA1LjEtMS4zIDIgMS4zIDEuNS0zLjkgNi45LTAuMSA1LjQtMiAzLjUtMy4yIDYgMC4zIDAuMiAxIDAuNSAxLjMgMC42LTAuOSAwLTEuNyAwLjEtMi42IDAuMiAwLjYgNS44LTMuOSA0LjktNC43IDguNy0wLjggMi43LTQuNCAyLjktNS40IDUuNC0xIDIuMy0zLjUgMy4zLTUuNiA0LjItMC45IDItMi4zIDMuNy00LjQgNC41LTAuMyAwLjgtMC41IDEuNy0xIDIuNS0xLjUgMS4yLTMuOSAxLjQtNC40IDMuNC0wLjYgMS41LTIuMiAxLjgtMy41IDIuNC0wLjcgMC42LTEuMSAxLjYtMS44IDIuMi0wLjggMC4yLTEuNSAwLjEtMi4yIDAuMi0zLjEgNS4xLTMgMS4zLTQuNyA0LjgtMi40LTAuNS0zLjggMS44LTYgMS44IDAgMC4yIDAgMC43LTAuMSAwLjkgMiAwLjkgMi42IDMuMSAzLjggNC43IDAuMyAwLjggMS4zIDAuNSAyIDAuNy0wLjIgMC40LTAuMyAwLjgtMC40IDEuMyAwLjkgMC42IDEuOCAxLjIgMi44IDEuNyAwLjUgMSAxLjIgMS45IDEuOSAyLjggMC4xLTAuMyAwLjQtMC44IDAuNS0xLjEgMC41IDAuNyAwLjIgMS4zLTAuMyAxLjkgMS41IDAuMyAyLjIgMi4xIDMuOCAyLjItMC40IDAuMi0xIDAuNi0wLjcgMS4yIDAuOCAwLjcgMS44IDEuMiAyLjcgMS45IDAuOCAxLjIgMi4xIDIuMSAzLjMgMyAwLjUgMiAwLjIgNCAwLjEgNi0yLjEgMC4yLTEuOCAyLjgtMi45IDQuMS0xLjMgMS42LTIuMyAzLjQtMy4yIDUuMy0xLjMgMS4yLTMuMyAxLjQtNC45IDItMS4zIDAuNC0yLjUtMC4yLTMuNy0wLjYtNC41IDUuOS04LjUgNC40LTEwLjYgNC41LTAuNy0xLTEuNi0xLjctMi43LTIuMi03LjcgNC4zLTUuMS02LjctNy4zLTE1LjQtMC4yLTIuNS0xLjYtMTIuNC00LjktMTQuNy0xLjMgMS44LTMuMSAzLjItNS4zIDMuOC0xIDAuOC02IDMuMS04LjkgMy4zbC0xLjggMS44Yy02LjggMC0xLjIgMS44LTguNyAxLjItMS41IDAuNS0xLjcgMi42LTUuOSAwLjUtMy4xIDQtNC43LTAuMS02LjkgMS45LTEuNyAxLjEtMy44IDEuOS01LjggMS42LTItMC41LTMuNiAxLjItNS41IDEuMi02LjItMS41LTIuOS0wLjQtNy45IDAuMS0xLjEtMC4xLTEuOS0xLjItMy0xLTIgMC4yLTQuNCAxLjMtNi4yLTAuMS0yLTItNC44IDEuOC05LjEtMS45LTIgMC4xLTQuMiAwLjktNS45LTAuMy0yLTEuMy00LjUtMC4yLTYuNi0wLjgtMi43LTIuOSA0LjYtMS43IDYuOC02LjUtMC45LTAuMS0xLjctMC4yLTIuNS0wLjItMC4zLTAuNS0wLjYtMC45LTAuOC0xLjMtMC42IDAuOC0xIDEuNy0xLjkgMi4yLTIuNSAwLjgtMTAuOSAxLjUtOS42LTAuNiAzLjUtMC43IDctMS44IDkuOS0zLjktMy41IDAuNy03LjEtMC4xLTEwLjItMS42IDgtMi44IDYgNC4xIDQ3LjQtMTguNCAxMC45LTcuNSAyNC4xLTggMzQuNC0xMy40IDMuNC0xOS45LTEuNi0xNC45LTAuNS0yNy4zIDAuOSAwLjMgMS44IDAuNCAyLjggMC4yIDEuNi0wLjQgMy4xIDAuMyA0LjcgMC44LTAuMSAwLjQtMC4xIDAuOC0wLjEgMS4yIDAuMiAwLjEgMC43IDAuMiAwLjkgMC4yIDAuMSAxLjkgMS42IDMuMiAyLjggNC41LTAuNSAxLjggMS40IDIuNyAyLjUgMy44IDEgMC42IDYuNSA2LjQgOC42IDYuMSAwLTAuMy0wLjEtMC44LTAuMi0xIDIuNSAwLjIgNC40LTEuOSA2LTMuNyAyLjEgMC4xIDMuMi0xLjggNC43LTIuOCAxLjEtMSAzLTEuNSAyLjktMy4zaDEuNWMwLjQtMC42IDAuOS0xLjIgMS40LTEuOCAwIDAgMTAuMS02IDExLjMtNi40IDEtMC42IDI0LjgtMTAuNiAzMy41LTE4LjcgMS40LTEuNCAyLjgtMi45IDQtNC40eiIgZmlsbD0iY3VycmVudENvbG9yIi8+PC9zdmc+',
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjIxOTAgODAgMjgwIDE0MCI+PHBhdGggZD0ibTIzMzMuMyAxMDYuOWMwLjMgMC44IDAuNSAxLjcgMS4xIDIuNCAwLjYgMC4zIDEuMyAwLjMgMiAwLjUgMC44IDIuNC0yIDMuOC0yLjcgNS45LTAuOSAwLjMtMS44IDAuNy0yLjEgMS43IDAuNC0wLjEgMC45LTAuMiAxLjQtMC4zLTAuMyAwLjUtMC42IDEtMC45IDEuNiAxLjIgMS4zIDIuNSAyLjUgNC4xIDMuMi0wLjQgMi4xLTEuNSAzLjgtMy4yIDUgMy40IDEuOS0xLjggMC43LTEuMiA0LjkgMC4yIDEuOS0xLjQgMy4yLTIuMyA0LjgtMS4zIDEuNy0xLjIgNC4xLTIuNiA1LjctMS4yIDEuNS0yLjEgMy4yLTMgNC45LTAuNiAxLjMtMi40IDEuMS0yLjkgMi41LTAuNCAzLTcuOCA2LjEtOC4xIDguNC0xLjEgMC42LTIuMiAxLjEtMy40IDEuMy0wLjcgMC45LTAuOSAyLjQtMi4xIDIuOC0yIDAuNi0zLjEgMi41LTUgMy4zLTAuNCAxLjEtMC41IDIuMi0wLjggMy4zIDAuMiAwLjEgMC42IDAuNCAwLjggMC42LTAuNCAwLjQtMS40IDAuNS0xLjIgMS4zIDEuOSAxLjMgMy42IDMgNSA0LjkgMC44IDEuMiAyLjIgMS43IDMuMiAyLjcgMSAwLjkgMS42IDIuNCAzLjEgMi44IDAgMC4yLTAuMSAwLjYtMC4xIDAuOCAxLjUgMC45IDIuNSAyLjMgNC4xIDMuMSAwLjcgMC4zIDAuOSAxLjEgMS4xIDEuOCAwLjIgMCAwLjUgMC4xIDAuNyAwLjIgMCAxIDEuOCA5LjUtMi4zIDEwLjktMS42IDAuOC0xLjggMy4zLTMuOCAzLjYtMi42IDAuNi0xLjYgNS43LTUuNCA3LTIuOCAxLjEtNS41IDMuMi04LjcgMi41LTMuNC0wLjctNi40IDEuOC05LjcgMC44LTEtMC43LTEuOC0xLjYtMi44LTIuMi0xLjYtMC4yLTMuMi0wLjEtNC43LTAuMS01LTQuMiAzLjQtMjEuNC0wLjctMzMuNC0yLjItMC40LTMuNyAxLjYtNS45IDEuMy0xLjggMC42LTMuOC0wLjUtNS41IDAuNC0xLjQgMC40LTIuOSAwLjMtNC40IDAuNy0xIDAuMy04LjYtMS4zLTEwLjQtMC42LTEuMiAwLjQtMi40IDAtMy42IDAtNS4xIDIuMS0yLjQgMi4zLTcuNiAwLjgtMi42IDAuMi00LjMgMi03LTAuNS0xLjMtMS40LTMuNS0wLjItNS4xLTAuOC0xLjUtMC44LTIuOC0yLjUtNC42LTIuMy0xLjkgMC0zLjYtMC44LTUuMS0xLjgtMi41LTAuMy00LjgtMS02LjktMi40LTEuNyAwLjItMy41IDAuMS01LTAuNyAxLTMuNiA1LjItNS45IDUuMS03LjgtMC41LTAuNS0xLTEtMS41LTEuNC0xMy44IDMtNi4yIDIuNy0xNC43IDEuMnYtMS4zYzIuMS0wLjggNC4yLTEuNSA2LTIuOS0xLjUtMC43LTMuMi0xLjItNC41LTIuMiAwLTAuMi0wLjItMC42LTAuMi0wLjkgOC41IDAuMSA2LjgtMS41IDE1LTIuOSAwLjItMC41IDAuMy0wLjkgMC42LTEuNCAwLjQgMC4xIDAuOCAwLjMgMS4zIDAuNSAxLjQtMC40IDIuOS0wLjcgNC40LTAuOCAwLjEtMC4zIDAuMi0wLjkgMC4zLTEuMiA2LjQgMS40IDYuMy0yIDExLjItMS44IDAuNi0xLjQgNi4zLTEuMyA5LjctMi43IDQuNS0wLjMgOS4xIDAuMiAxMy42LTAuMyAxLjgtMSA0IDAgNS43LTEuMi0wLjctMC4xLTEuMy0wLjItMi0wLjJ2LTAuM2MxLjMgMC4xIDIuNSAwLjUgMy44IDAuOCAxLjQtMC4yIDIuOC0wLjYgNC4zLTAuOCAwLTAuMi0wLjEtMC42LTAuMS0wLjggNi4zLTAuMSA0LjctNSA3LjUtNy43IDIuNS0yLjMgMS0yLjcgMS4yLTE0IDAuOS0wLjIgMS44LTAuNiAyLjctMS4xLTAuMSAwLjYtMC40IDEuNCAwLjIgMS44IDEuMi0wLjMgMi40LTEuMyAzLjctMC44IDEuNSAxLjQgMy41IDIuNiAzLjkgNC44LTAuMyAwLjItMC45IDAuNi0xLjEgMC44IDAuOCAyLjQgMi4zIDQuNSAzLjUgNi44bDEuMi0wLjZjLTAuMiAwLjItMC41IDAuNy0wLjYgMC45IDMuOSAyLjUgMS43IDAuOSA3LjktMi4yIDEuNy0wLjcgMi0yLjkgMy44LTMuNiAxLjYtMC44IDIuMy0yLjYgMy43LTMuNyAwLjgtMC42IDEuNy0xLjIgMi40LTIgMi4xLTAuNCAzLjEtMi42IDUtMy40IDEuNS0xIDMuNS0wLjcgNS0xLjkgMi4yLTEuMiAxNS4xLTguNCAxNi4yLTl6IiBmaWxsPSJjdXJyZW50Q29sb3IiLz48L3N2Zz4='
  ];

  // ── Cloud shapes (pure CSS SVG) ──
  const _CLOUD_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 80"><path d="M160 60 Q170 30 150 30 Q145 10 120 15 Q110 0 90 10 Q70 0 55 15 Q35 12 30 30 Q10 28 15 50 Q5 55 15 60 Z" fill="white" opacity="0.85"/></svg>';
  const _CLOUD_SVG2 = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 90"><path d="M220 70 Q235 35 210 32 Q205 8 175 14 Q162 -2 135 12 Q108 -4 85 16 Q58 10 52 35 Q28 30 32 55 Q10 62 22 72 Z" fill="white" opacity="0.75"/></svg>';
  const _CLOUD_SVG3 = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 70"><path d="M130 55 Q142 25 122 24 Q118 6 97 11 Q87 -1 70 9 Q52 -1 43 13 Q25 10 23 28 Q8 26 12 44 Q3 49 12 55 Z" fill="white" opacity="0.6"/></svg>';

  // ── State ──
  let _birdsActive = false;
  let _birdsRAF = null;
  let _birdsContainer = null;
  let _birds = [];
  let _clouds = [];
  let _lastTime = 0;

  // ── Bird instance ──
  function _makeBird(W, H, img) {
    // Кривая Безье: случайная сложная траектория через весь экран
    const fromEdge = Math.random() < 0.5 ? 'left' : 'right';
    const size = 40 + Math.random() * 60;
    const y0 = H * (0.05 + Math.random() * 0.75);
    const y1 = H * (0.05 + Math.random() * 0.75);
    // Контрольные точки для S-образной кривой
    const cp1x = W * (0.2 + Math.random() * 0.3);
    const cp1y = y0 + (Math.random() - 0.5) * H * 0.4;
    const cp2x = W * (0.5 + Math.random() * 0.3);
    const cp2y = y1 + (Math.random() - 0.5) * H * 0.4;
    const speed = 0.00008 + Math.random() * 0.00012; // скорость прохождения кривой
    const startX = fromEdge === 'left' ? -size * 1.5 : W + size * 1.5;
    const endX   = fromEdge === 'left' ? W + size * 1.5 : -size * 1.5;
    // Элемент
    const el = document.createElement('img');
    el.src = img;
    el.style.cssText = `position:absolute;width:${size}px;height:auto;opacity:${0.7 + Math.random()*0.3};pointer-events:none;transform-origin:center;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));`;
    if (fromEdge === 'right') el.style.transform = 'scaleX(-1)';
    return {
      el, fromEdge, size,
      x0: startX, y0, x1: endX, y1,
      cp1x, cp1y, cp2x, cp2y,
      t: -Math.random(), // отрицательный старт = задержка
      speed,
      active: false,
      // Небольшое покачивание крыльев через scale
      flapPhase: Math.random() * Math.PI * 2,
      flapSpeed: 2 + Math.random() * 3,
    };
  }

  // Кубическая кривая Безье
  function _bezier(t, p0, p1, p2, p3) {
    const mt = 1 - t;
    return mt*mt*mt*p0 + 3*mt*mt*t*p1 + 3*mt*t*t*p2 + t*t*t*p3;
  }

  // ── Cloud instance ──
  function _makeCloud(W, H, svgData) {
    const w = 120 + Math.random() * 180;
    const y = H * (0.02 + Math.random() * 0.22); // верхняя треть
    const speed = 0.008 + Math.random() * 0.018; // px/ms — медленно
    const el = document.createElement('img');
    el.src = 'data:image/svg+xml;base64,' + btoa(svgData);
    el.style.cssText = `position:absolute;width:${w}px;height:auto;opacity:${0.15 + Math.random()*0.2};pointer-events:none;top:${y}px;filter:blur(1px);`;
    return {
      el, w, y, speed,
      x: -w - Math.random() * W, // старт за левым краем
    };
  }

  // ── Animation loop ──
  function _tick(ts) {
    if (!_birdsActive) return;
    const dt = Math.min(ts - _lastTime, 50);
    _lastTime = ts;
    const W = _birdsContainer.offsetWidth || 960;
    const H = _birdsContainer.offsetHeight || 540;

    // Птицы
    _birds.forEach(b => {
      b.t += b.speed * dt;
      if (b.t > 1.1) {
        // Переспавнить
        const newB = _makeBird(W, H, b.el.src);
        Object.assign(b, newB);
        b.el.style.transform = b.fromEdge === 'right' ? 'scaleX(-1)' : '';
        return;
      }
      if (b.t < 0) return; // задержка
      const tc = Math.max(0, Math.min(1, b.t));
      const x = _bezier(tc, b.x0, b.cp1x, b.cp2x, b.x1);
      const y = _bezier(tc, b.y0, b.cp1y, b.cp2y, b.y1);
      // Тангент для поворота
      const eps = 0.01;
      const tc2 = Math.min(1, tc + eps);
      const dx = _bezier(tc2, b.x0, b.cp1x, b.cp2x, b.x1) - x;
      const dy = _bezier(tc2, b.y0, b.cp1y, b.cp2y, b.y1) - y;
      const angle = Math.atan2(dy, dx) * 180 / Math.PI;
      // Покачивание (имитация взмахов крыльев через scaleY)
      const flap = 1 + 0.06 * Math.sin(b.flapPhase + tc * 20 * b.flapSpeed);
      const flip = b.fromEdge === 'right' ? 'scaleX(-1) ' : '';
      b.el.style.transform = `${flip}translate(${x.toFixed(1)}px,${y.toFixed(1)}px) rotate(${angle.toFixed(1)}deg) scaleY(${flap.toFixed(3)})`;
      b.el.style.left = (-b.size/2) + 'px';
      b.el.style.top  = (-b.size/4) + 'px';
    });

    // Облака
    _clouds.forEach(c => {
      c.x += c.speed * dt;
      if (c.x > W + c.w * 0.5) c.x = -c.w * 1.2;
      c.el.style.left = c.x.toFixed(1) + 'px';
    });

    _birdsRAF = requestAnimationFrame(_tick);
  }

  // ── Public API ──
  window._birdsThemeStart = function(container) {
    if (_birdsActive) _birdsThemeStop();
    _birdsContainer = container;
    _birdsActive = true;
    _lastTime = performance.now();

    const W = container.offsetWidth || 960;
    const H = container.offsetHeight || 540;

    // Создаём слой
    const layer = document.createElement('div');
    layer.id = '_birds-layer';
    layer.style.cssText = 'position:absolute;inset:0;overflow:hidden;z-index:0;pointer-events:none;';
    container.appendChild(layer);

    // Облака — 6 штук в фоне
    const cloudSvgs = [_CLOUD_SVG, _CLOUD_SVG2, _CLOUD_SVG3];
    for (let i = 0; i < 6; i++) {
      const c = _makeCloud(W, H, cloudSvgs[i % 3]);
      c.x = Math.random() * W; // распределяем по экрану
      layer.appendChild(c.el);
      _clouds.push(c);
    }

    // Птицы — 12 штук
    for (let i = 0; i < 12; i++) {
      const uri = _BIRD_URIS[i % _BIRD_URIS.length];
      const b = _makeBird(W, H, uri);
      b.t = -Math.random() * 1.5; // разброс стартового времени
      layer.appendChild(b.el);
      _birds.push(b);
    }

    _birdsRAF = requestAnimationFrame(_tick);
  };

  window._birdsThemeStop = function() {
    _birdsActive = false;
    if (_birdsRAF) { cancelAnimationFrame(_birdsRAF); _birdsRAF = null; }
    const layer = _birdsContainer && _birdsContainer.querySelector('#_birds-layer');
    if (layer) layer.remove();
    _birds = []; _clouds = [];
    _birdsContainer = null;
  };

  window._birdsThemeActive = function() { return _birdsActive; };

})();
