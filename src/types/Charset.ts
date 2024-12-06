// 文字コード
export type Charset =
    "us-ascii"      // 7bitのascii文字列
    |"euc-jp"	    // 日本語 EUC
    |"shift_jis"	// シフトJISコード
    |"utf-8"	    // Unicode (UTF-8)
    |"utf-16"	    // Unicode (UTF-16)
    |"windows-31j"  // Microsoftコードページ932。Shift_JISを拡張したもの
;