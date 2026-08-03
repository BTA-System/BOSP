// BOS-Upload&Download.js
(function(Scratch) {
    'use strict';

    if (!Scratch.extensions.unsandboxed) {
        throw new Error('BOS-Upload&Download 扩展需要在非沙盒模式下运行');
    }

    class BOSUploadDownload {
        constructor() {
            this._uploadStatus = '';
            this._uploadedFileName = '';
            this._uploadedFileExt = '';
            this._uploadedFileText = '';
            this._uploadedFileBinary = '';
            this._fileSelected = false;
        }

        getInfo() {
            return {
                id: 'bosuploaddownload',
                name: 'BOS-Upload&Download',
                blocks: [
                    // 上传部分
                    {
                        opcode: 'selectFile',
                        blockType: Scratch.BlockType.COMMAND,
                        text: '选择文件上传'
                    },
                    {
                        opcode: 'whenFileSelected',
                        blockType: Scratch.BlockType.HAT,
                        text: '当文件被选择时',
                        isEdgeActivated: false
                    },
                    {
                        opcode: 'getUploadStatus',
                        blockType: Scratch.BlockType.REPORTER,
                        text: '上传状态'
                    },
                    {
                        opcode: 'getUploadedFileName',
                        blockType: Scratch.BlockType.REPORTER,
                        text: '上传的文件名'
                    },
                    {
                        opcode: 'getUploadedFileExt',
                        blockType: Scratch.BlockType.REPORTER,
                        text: '上传的文件扩展名'
                    },
                    {
                        opcode: 'getUploadedFileText',
                        blockType: Scratch.BlockType.REPORTER,
                        text: '上传的文件文本内容'
                    },
                    {
                        opcode: 'getUploadedFileBinary',
                        blockType: Scratch.BlockType.REPORTER,
                        text: '上传的文件二进制 (8位)'
                    },
                    // 下载部分
                    {
                        opcode: 'exportFile',
                        blockType: Scratch.BlockType.COMMAND,
                        text: '导出文件 文件名 [FILENAME] 内容 [CONTENT]',
                        arguments: {
                            FILENAME: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'file.txt'
                            },
                            CONTENT: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'Hello BOS!'
                            }
                        }
                    }
                ]
            };
        }

        // ---------- 上传 ----------
        selectFile() {
            const input = document.createElement('input');
            input.type = 'file';
            input.style.display = 'none';
            document.body.appendChild(input);

            input.addEventListener('change', () => {
                const file = input.files[0];
                if (!file) {
                    document.body.removeChild(input);
                    return;
                }

                const fullName = file.name;
                const ext = fullName.includes('.') ? fullName.split('.').pop().toLowerCase() : '';
                this._uploadedFileName = fullName;
                this._uploadedFileExt = ext;
                this._fileSelected = true;

                const reader = new FileReader();
                reader.onload = (event) => {
                    const buffer = event.target.result;
                    const bytes = new Uint8Array(buffer);

                    const isText = (ext === 'txt' || ext === 'bm' || ext === 'bsh' || ext === 'bmc' ||
                                    ext === 'c' || ext === 'h' || ext === 'cpp' || ext === 'js' ||
                                    ext === 'py' || ext === 'md' || ext === 'json' || ext === 'xml' ||
                                    fullName.endsWith('.bm') || fullName.endsWith('.bsh') || fullName.endsWith('.bmc'));
                    if (isText) {
                        const textReader = new FileReader();
                        textReader.onload = (ev) => {
                            const text = ev.target.result;
                            if (/[^\x00-\x7F]/.test(text)) {
                                this._uploadStatus = '文件上传失败：内容包含非 ASCII 字符（如中文）';
                                this._uploadedFileText = '';
                                this._uploadedFileBinary = '';
                                this._fireHat();
                                document.body.removeChild(input);
                                return;
                            }
                            this._uploadedFileText = text;
                            this._uploadStatus = '成功';
                            // 生成二进制（无空格，连续字符串）
                            this._uploadedFileBinary = this._bytesToBinary(bytes);
                            this._fireHat();
                            document.body.removeChild(input);
                        };
                        textReader.readAsText(file);
                    } else {
                        this._uploadedFileText = '';
                        this._uploadStatus = '成功（二进制文件）';
                        this._uploadedFileBinary = this._bytesToBinary(bytes);
                        this._fireHat();
                        document.body.removeChild(input);
                    }
                };
                reader.readAsArrayBuffer(file);
            });

            input.click();
        }

        // 将字节数组转换为连续的 8 位二进制字符串（无空格）
        _bytesToBinary(bytes) {
            let binaryStr = '';
            for (let i = 0; i < bytes.length; i++) {
                const byte = bytes[i];
                const bin8 = byte.toString(2).padStart(8, '0');
                binaryStr += bin8;  // 直接拼接，不加空格
            }
            return binaryStr;
        }

        _fireHat() {
            Scratch.vm.runtime.startHats('bosuploaddownload_whenFileSelected');
        }

        whenFileSelected() {}

        getUploadStatus() {
            return this._uploadStatus || '';
        }

        getUploadedFileName() {
            return this._uploadedFileName || '';
        }

        getUploadedFileExt() {
            return this._uploadedFileExt || '';
        }

        getUploadedFileText() {
            return this._uploadedFileText || '';
        }

        getUploadedFileBinary() {
            return this._uploadedFileBinary || '';
        }

        // ---------- 下载 ----------
        exportFile(args) {
            const fileName = args.FILENAME || 'file.txt';
            const content = args.CONTENT || '';

            const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
    }

    Scratch.extensions.register(new BOSUploadDownload());
})(Scratch);
