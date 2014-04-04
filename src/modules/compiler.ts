///<reference path="../../typings/typescript/typescript.d.ts" />


module GruntTs{
    export class Compiler extends TypeScript.TypeScriptCompiler{
        public compileEmitTargets(
            emitTargets: string[],
            libDPath: string,
            resolvePath: (path: string) => string,
            continueOnDiagnostics = false): TypeScript.Iterator<TypeScript.CompileResult> {
            return new CompilerIterator(emitTargets, libDPath, this, resolvePath, continueOnDiagnostics);
        }
    }

    enum CompilerPhase {
        Syntax,
        Semantics,
        EmitOptionsValidation,
        Emit,
        DeclarationEmit,
    }

    class CompilerIterator implements TypeScript.Iterator<TypeScript.CompileResult> {
        private compilerPhase: CompilerPhase;
        private index: number = -1;
        private fileNames: string[] = null;
        private _current: TypeScript.CompileResult = null;
        private _emitOptions: TypeScript.EmitOptions = null;
        private _sharedEmitter: TypeScript.Emitter = null;
        private _sharedDeclarationEmitter: TypeScript.DeclarationEmitter = null;
        private hadSyntacticDiagnostics: boolean = false;
        private hadSemanticDiagnostics: boolean = false;
        private hadEmitDiagnostics: boolean = false;

        constructor(private emitTargets: string[],
                    private libDPath: string,
                    private compiler: TypeScript.TypeScriptCompiler,
                    private resolvePath: (path: string) => string,
                    private continueOnDiagnostics: boolean,
                    startingPhase = CompilerPhase.Syntax) {
            this.fileNames = compiler.fileNames();
            this.compilerPhase = startingPhase;
        }

        public current(): TypeScript.CompileResult {
            return this._current;
        }

        public moveNext(): boolean {
            this._current = null;

            // Attempt to move the iterator 'one step' forward.  Note: this may produce no result
            // (for example, if we're emitting everything to a single file).  So only return once
            // we actually have a result, or we're done enumerating.
            while (this.moveNextInternal()) {
                if (this._current) {
                    return true;
                }
            }

            return false;
        }

        private moveNextInternal(): boolean {
            this.index++;

            // If we're at the end of hte set of files the compiler knows about, then move to the
            // next phase of compilation.
            while (this.shouldMoveToNextPhase()) {
                this.index = 0;
                this.compilerPhase++;
            }

            if (this.compilerPhase > CompilerPhase.DeclarationEmit) {
                // We're totally done.
                return false;
            }

            switch (this.compilerPhase) {
                case CompilerPhase.Syntax:
                    return this.moveNextSyntaxPhase();
                case CompilerPhase.Semantics:
                    return this.moveNextSemanticsPhase();
                case CompilerPhase.EmitOptionsValidation:
                    return this.moveNextEmitOptionsValidationPhase();
                case CompilerPhase.Emit:
                    return this.moveNextEmitPhase();
                case CompilerPhase.DeclarationEmit:
                    return this.moveNextDeclarationEmitPhase();
            }
        }

        private shouldMoveToNextPhase(): boolean {
            switch (this.compilerPhase) {
                case CompilerPhase.EmitOptionsValidation:
                    // Only one step in emit validation.  We're done once we do that step.
                    return this.index === 1;

                case CompilerPhase.Syntax:
                case CompilerPhase.Semantics:
                    // Each of these phases are done when we've processed the last file.
                    return this.index === this.fileNames.length;

                case CompilerPhase.Emit:
                case CompilerPhase.DeclarationEmit:
                    // Emitting is done when we get 'one' past the end of hte file list.  This is
                    // because we use that step to collect the results from the shared emitter.
                    return this.index === (this.fileNames.length + 1);
            }

            return false;
        }

        private moveNextSyntaxPhase(): boolean {
            TypeScript.Debug.assert(this.index >= 0 && this.index < this.fileNames.length);
            var fileName = this.fileNames[this.index];

            //TODO: change
            if(fileName === this.libDPath){
                return true;
            }
            var diagnostics = this.compiler.getSyntacticDiagnostics(fileName);
            if (diagnostics.length) {
                if (!this.continueOnDiagnostics) {
                    this.hadSyntacticDiagnostics = true;
                }

                this._current = TypeScript.CompileResult.fromDiagnostics(diagnostics);
            }

            return true;
        }

        private moveNextSemanticsPhase(): boolean {
            // Don't move forward if there were syntax diagnostics.
            if (this.hadSyntacticDiagnostics) {
                return false;
            }

            TypeScript.Debug.assert(this.index >= 0 && this.index < this.fileNames.length);
            var fileName = this.fileNames[this.index];

            //TODO: change
            if(fileName === this.libDPath){
                return true;
            }

            var diagnostics = this.compiler.getSemanticDiagnostics(fileName);
            if (diagnostics.length) {
                if (!this.continueOnDiagnostics) {
                    this.hadSemanticDiagnostics = true;
                }

                this._current = TypeScript.CompileResult.fromDiagnostics(diagnostics);
            }

            return true;
        }

        private moveNextEmitOptionsValidationPhase(): boolean {
            TypeScript.Debug.assert(!this.hadSyntacticDiagnostics);

            if (!this._emitOptions) {
                this._emitOptions = new TypeScript.EmitOptions(this.compiler, this.resolvePath);
            }

            if (this._emitOptions.diagnostic()) {
                if (!this.continueOnDiagnostics) {
                    this.hadEmitDiagnostics = true;
                }

                this._current = TypeScript.CompileResult.fromDiagnostics([this._emitOptions.diagnostic()]);
            }

            return true;
        }

        private moveNextEmitPhase(): boolean {
            TypeScript.Debug.assert(!this.hadSyntacticDiagnostics);
            TypeScript.Debug.assert(this._emitOptions);

            if (this.hadEmitDiagnostics) {
                return false;
            }

            TypeScript.Debug.assert(this.index >= 0 && this.index <= this.fileNames.length);
            if (this.index < this.fileNames.length) {
                var fileName = this.fileNames[this.index];
                //TODO: change
                if(!this.emitTargets.some((target) => target === fileName)){
                    return true;
                }

                var document = this.compiler.getDocument(fileName);

                // Try to emit this single document.  It will either get emitted to its own file
                // (in which case we'll have our call back triggered), or it will get added to the
                // shared emitter (and we'll take care of it after all the files are done.
                this._sharedEmitter = this.compiler._emitDocument(
                    document, this._emitOptions,
                    outputFiles => { this._current = TypeScript.CompileResult.fromOutputFiles(outputFiles) },
                    this._sharedEmitter);
                return true;
            }

            // If we've moved past all the files, and we have a multi-input->single-output
            // emitter set up.  Then add the outputs of that emitter to the results.
            if (this.index === this.fileNames.length && this._sharedEmitter) {
                // Collect shared emit result.
                this._current = TypeScript.CompileResult.fromOutputFiles(this._sharedEmitter.getOutputFiles());
            }

            return true;
        }

        private moveNextDeclarationEmitPhase(): boolean {
            TypeScript.Debug.assert(!this.hadSyntacticDiagnostics);
            TypeScript.Debug.assert(!this.hadEmitDiagnostics);
            if (this.hadSemanticDiagnostics) {
                return false;
            }

            if (!this.compiler.compilationSettings().generateDeclarationFiles()) {
                return false;
            }

            TypeScript.Debug.assert(this.index >= 0 && this.index <= this.fileNames.length);
            if (this.index < this.fileNames.length) {
                var fileName = this.fileNames[this.index];
                //TODO: change
                if(!this.emitTargets.some((target) => target === fileName)){
                    return true;
                }

                var document = this.compiler.getDocument(fileName);

                this._sharedDeclarationEmitter = this.compiler._emitDocumentDeclarations(
                    document, this._emitOptions,
                    file => { this._current = TypeScript.CompileResult.fromOutputFiles([file]); },
                    this._sharedDeclarationEmitter);
                return true;
            }

            // If we've moved past all the files, and we have a multi-input->single-output
            // emitter set up.  Then add the outputs of that emitter to the results.
            if (this.index === this.fileNames.length && this._sharedDeclarationEmitter) {
                this._current = TypeScript.CompileResult.fromOutputFiles([this._sharedDeclarationEmitter.getOutputFile()]);
            }

            return true;
        }
    }

}

export = GruntTs;
