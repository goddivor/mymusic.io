#!/usr/bin/env python3
"""
Fix react-native-track-player for the New Architecture (RN 0.82+).

Its @ReactMethod functions are written as expression bodies:

    fun play(callback: Promise) = scope.launch { ... }

which return `Job` (non-void). The TurboModule interop rejects any async
@ReactMethod whose return type isn't `void`, crashing the app at startup:

    "TurboModule system assumes returnType == void iff the method is synchronous"

This rewrites them into block bodies that return Unit:

    fun play(callback: Promise) { scope.launch { ... } }

Idempotent: running twice is a no-op (it only matches `= scope.launch {`).
"""
import re
import sys

PATH = sys.argv[1]

with open(PATH, "r") as f:
    src = f.read()

# Matches both inline (`= scope.launch {`) and split (`=\n  scope.launch {`) forms.
pattern = re.compile(r"=\s*scope\.launch\s*\{")


def find_matching_brace(text, open_index):
    """Return index of the `}` matching the `{` at open_index, skipping
    string literals and line comments."""
    depth = 0
    i = open_index
    n = len(text)
    while i < n:
        c = text[i]
        if c == '"':
            # skip string literal (handle escapes)
            i += 1
            while i < n:
                if text[i] == "\\":
                    i += 2
                    continue
                if text[i] == '"':
                    break
                i += 1
        elif c == "/" and i + 1 < n and text[i + 1] == "/":
            # skip line comment
            while i < n and text[i] != "\n":
                i += 1
        elif c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                return i
        i += 1
    raise RuntimeError("unbalanced braces starting at %d" % open_index)


matches = list(pattern.finditer(src))
print(f"found {len(matches)} `scope.launch` expression bodies to fix")

# Process from last to first so earlier offsets stay valid.
for m in reversed(matches):
    launch_open = m.end() - 1  # index of the `{` after scope.launch
    close = find_matching_brace(src, launch_open)
    # 1) add the function's closing brace right after the launch block closes
    src = src[: close + 1] + " }" + src[close + 1 :]
    # 2) turn `= scope.launch {` into `{ scope.launch {`
    src = src[: m.start()] + "{ scope.launch {" + src[m.end() :]

with open(PATH, "w") as f:
    f.write(src)

print("done")
