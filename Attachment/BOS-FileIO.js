// BOS-Upload&Download.js
(function(Scratch) {
    'use strict';

    if (!Scratch.extensions.unsandboxed) {
        throw new Error('BOS-Upload&Download 扩展需要在非沙盒模式下运行');
    }

    class BOSUploadDownload {
        constructor() {
            // 上传状态
            this._uploadStatus = '';        // 空表示未上传，'成功' 或错误信息
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
                    // ====== 上传部分 ======
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

                    // ====== 下载部分 ======
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

        // ---------- 上传实现 ----------
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

                // 读取文件为 ArrayBuffer 以获取二进制
                const reader = new FileReader();
                reader.onload = (event) => {
                    const buffer = event.target.result;
                    const bytes = new Uint8Array(buffer);

                    // 检测文件是否包含非 ASCII 字符（只对文本文件检测）
                    const isText = (ext === 'txt' || ext === 'bm' || ext === 'bsh' || ext === 'bmc' ||
                                    ext === 'c' || ext === 'h' || ext === 'cpp' || ext === 'js' ||
                                    ext === 'py' || ext === 'md' || ext === 'json' || ext === 'xml' ||
                                    fullName.endsWith('.bm') || fullName.endsWith('.bsh') || fullName.endsWith('.bmc'));
                    if (isText) {
                        // 读取文本内容以检测是否包含非 ASCII
                        const textReader = new FileReader();
                        textReader.onload = (ev) => {
                            const text = ev.target.result;
                            // 检测是否包含非 ASCII 字符（Unicode > 127）
                            if (/[^\x00-\x7F]/.test(text)) {
                                this._uploadStatus = '文件上传失败：内容包含非 ASCII 字符（如中文）';
                                this._uploadedFileText = '';
                                this._uploadedFileBinary = '';
                                this._fireHat();
                                document.body.removeChild(input);
                                return;
                            }
                            // 合法文本，保存内容
                            this._uploadedFileText = text;
                            this._uploadStatus = '成功';
                            // 生成二进制（字节对齐8位）
                            this._uploadedFileBinary = this._bytesToBinary(bytes);
                            this._fireHat();
                            document.body.removeChild(input);
                        };
                        textReader.readAsText(file);
                    } else {
                        // 非文本文件，直接生成二进制（不检测合法性）
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

        // 将字节数组转换为 8 位二进制字符串，字节间空格分隔
        _bytesToBinary(bytes) {
            let binaryStr = '';
            for (let i = 0; i < bytes.length; i++) {
                const byte = bytes[i];
                const bin8 = byte.toString(2).padStart(8, '0');
                binaryStr += bin8;
                if (i < bytes.length - 1) binaryStr += ' ';
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

        // ---------- 下载实现 ----------
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
