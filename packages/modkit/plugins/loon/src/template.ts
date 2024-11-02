import { type ModuleMock, Template, logger, objectEntries, toKebabCase } from '@iringo/modkit-shared';
import type { LoonArgumentType } from './index';

type LoonMockDataType =
  | 'json'
  | 'text'
  | 'css'
  | 'html'
  | 'javascript'
  | 'plain'
  | 'png'
  | 'gif'
  | 'jpeg'
  | 'tiff'
  | 'svg'
  | 'mp4'
  | 'form-data';

const mockDataTypeMap: Record<LoonMockDataType, string[]> = {
  json: ['application/json', 'text/json'],
  text: ['text/plain'],
  css: ['text/css'],
  html: ['text/html'],
  javascript: ['application/javascript', 'text/javascript'],
  plain: ['text/plain'],
  png: ['image/png'],
  gif: ['image/gif'],
  jpeg: ['image/jpeg'],
  tiff: ['image/tiff'],
  svg: ['image/svg'],
  mp4: ['video/mp4'],
  'form-data': ['multipart/form-data'],
};

export class LoonTemplate extends Template {
  get Metadata() {
    const { name, description, ...rest } = this.metadata;
    const result: Record<string, string | number | boolean | undefined> = {};
    result.name = name;
    result.desc = description;
    Object.entries(rest).forEach(([key, value]) => {
      result[key] = Array.isArray(value) ? value.join(',') : value;
    });
    return this.renderKeyValuePairs(result, { prefix: '#!' });
  }

  get General() {
    return this.renderKeyValuePairs(this.content.loonGeneral);
  }

  get Rule() {
    return this.content.rule
      ?.map((rule) => {
        if (typeof rule === 'string') {
          return rule;
        }
        switch (rule.type) {
          case 'RULE-SET': {
            let result = `RULE-SET, ${this.utils.getFilePath(rule.assetKey)}`;
            if (rule.policyName) {
              result += `, ${this.normalizeUnion(rule.policyName, 'custom')}`;
            }
            return result;
          }
          default:
            break;
        }
      })
      .join('\n')
      .trim();
  }

  get Argument() {
    return this.source.arguments
      ?.map((arg) => {
        let result = arg.key;
        let type: LoonArgumentType = 'input';
        if (arg.type === 'boolean') {
          type = 'switch';
        } else if (arg.options && arg.type !== 'array') {
          // 只有在有选项且不是数组类型时才使用 select
          type = 'select';
        }
        result += ` = ${type}`;
        result += `,${this.getDefaultValue(arg.defaultValue)}`;
        if (arg.options && type === 'select') {
          result += ',';
          result += arg.options
            .filter((item) => item.key !== arg.defaultValue)
            .map((option) => `${this.getDefaultValue(option.key)}`)
            .join(',');
        }
        if (arg.name) {
          result += `,tag=${arg.name}`;
        }
        if (arg.description) {
          result += `,desc=${arg.description}`;
        }
        return result;
      })
      .join('\n')
      .trim();
  }

  get Script() {
    return this.content.script
      ?.map((script, index) => {
        let line = '';
        const { type, pattern, cronexp, scriptKey, argument, injectArgument, name, ...rest } = script;
        switch (type) {
          case 'http-request':
          case 'http-response':
            line += `${type} ${pattern} `;
            break;
          case 'cron':
            line += `${type} "${cronexp}" `;
            break;
          case 'generic':
            line += `${type} `;
            break;
          // case 'network-changed':
          case 'event':
            line += 'network-changed ';
            break;
          case 'dns':
          default:
            logger.warn(`[Loon] Unsupported script type: ${type}`);
            break;
        }
        const parameters: Record<string, string | number | boolean | undefined> = {};
        parameters['script-path'] = this.utils.getScriptPath(scriptKey);
        parameters.tag = name || `Script${index}`;
        objectEntries(rest).forEach(([key, value]) => {
          parameters[toKebabCase(key)] = value;
        });
        if (injectArgument || argument) {
          parameters.argument = argument || `[${this.source.arguments?.map((item) => `{${item.key}}`).join(',')}]`;
        }
        line += this.renderKeyValuePairs(parameters, { join: ', ', separator: '=' });
        return line;
      })
      .join('\n')
      .trim();
  }

  get MITM() {
    return this.content.mitm?.hostname?.join(', ');
  }

  get Mock() {
    return this.content.mock
      ?.map((mock) => {
        const { pattern, dataType, data, statusCode } = mock;
        let line = `${pattern.replaceAll(' ', '\\x20')} mock-response-body `;
        if (statusCode) {
          line += `status-code=${statusCode} `;
        }
        const mockDataType = this.#transformMockDataType(mock);
        if (mockDataType) {
          line += `data-type=${mockDataType} `;
        }
        if (dataType === 'base64') {
          line += 'mock-data-is-base64=true ';
        }
        if (typeof data === 'string') {
          const filePath = this.utils.getFilePath(data);
          line += filePath ? `data-path=${filePath} ` : `data="${data}" `;
        } else if (data && 'content' in data) {
          line += `data="${data.content}" `;
        }
        return line;
      })
      .join('\n')
      .trim();
  }

  #transformMockDataType({ dataType, headers }: ModuleMock): LoonMockDataType | undefined {
    if (typeof headers === 'object') {
      const contentType = headers['Content-Type'] || headers['content-type'];
      if (contentType) {
        const [type] = contentType.split(';');
        for (const [key, values] of objectEntries(mockDataTypeMap)) {
          if (values.includes(type)) {
            return key;
          }
        }
      }
    }
    if (dataType === 'text') {
      return 'text';
    }
    return undefined;
  }
}